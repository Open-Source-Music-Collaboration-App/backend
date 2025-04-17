const fs = require('fs');
const path = require('path');

/**
 * Compares two versions of ableton_project.json to identify track changes
 * @param {string|object} oldJson - Previous version of ableton_project.json
 * @param {string|object} newJson - New version of ableton_project.json
 * @returns {Object} Object containing added, modified, and removed tracks
 */
function compareTrackChanges(oldJson, newJson) {
    // Parse if strings
    const oldProject = typeof oldJson === 'string' ? JSON.parse(oldJson) : oldJson;
    const newProject = typeof newJson === 'string' ? JSON.parse(newJson) : newJson;

    const oldTracks = oldProject.tracks || [];
    const newTracks = newProject.tracks || [];

    // Create lookup maps
    const oldTrackMap = new Map(oldTracks.map(track => [track.id, track]));
    const newTrackMap = new Map(newTracks.map(track => [track.id, track]));

    const changes = {
        added: [],
        modified: [],
        removed: []
    };

    // Find added and modified tracks
    newTracks.forEach(track => {
        const oldTrack = oldTrackMap.get(track.id);
        if (!oldTrack) {
            changes.added.push({
                id: track.id,
                name: track.name,
                type: track.type
            });
        } else if (JSON.stringify(oldTrack) !== JSON.stringify(track)) {
            changes.modified.push({
                id: track.id,
                name: track.name,
                type: track.type
            });
        }
    });

    // Find removed tracks
    oldTracks.forEach(track => {
        if (!newTrackMap.has(track.id)) {
            changes.removed.push({
                id: track.id,
                name: track.name,
                type: track.type
            });
        }
    });

    return changes;
}

/**
 * DiffEngine - Manages comparator registry and handles diff creation
 */
class DiffEngine {
    constructor() {
        this.comparators = [];
        this.trackLevelComparators = [];
    }

    /**
     * Register a new track-level comparator for comparing specific aspects of tracks
     * @param {Object} comparator - The comparator to register
     */
    registerTrackComparator(comparator) {
        if (!comparator.type || typeof comparator.compare !== 'function') {
            throw new Error(`Invalid comparator: must have 'type' and 'compare' function`);
        }
        this.trackLevelComparators.push(comparator);
    }

    /**
     * Register a new project-level comparator for comparing overall project changes
     * @param {Object} comparator - The comparator to register
     */
    registerProjectComparator(comparator) {
        if (!comparator.type || typeof comparator.compare !== 'function') {
            throw new Error(`Invalid comparator: must have 'type' and 'compare' function`);
        }
        this.comparators.push(comparator);
    }

    /**
     * Create a detailed diff between two project versions
     * @param {Object} oldVersion - The previous version of the project
     * @param {Object} newVersion - The current version of the project
     * @returns {Object} Detailed diff with all changes
     */
    createDetailedDiff(oldVersion, newVersion) {

      //make oldversion into a json object
      if (typeof oldVersion === 'string') {
        oldVersion = JSON.parse(oldVersion);
      }
      //make newversion into a json object
      if (typeof newVersion === 'string') {
        newVersion = JSON.parse(newVersion);
      } 
        // Initialize result object
        const result = {
            summary: {
                totalChanges: 0,
                changedTracks: [],
                addedTracks: [],
                removedTracks: [],
                modifiedTracks: []
            }
        };

        // Initialize categories based on registered comparators
        [...this.trackLevelComparators, ...this.comparators].forEach(comparator => {
            result[comparator.type] = [];
        });

        // Apply project-level comparators first
        this.comparators.forEach(comparator => {
            const changes = comparator.compare(oldVersion, newVersion);
            if (changes && changes.length > 0) {
                result[comparator.type].push(...changes);
                result.summary.totalChanges += changes.length;
            }
        });

        // First identify added/removed/modified tracks at high level
        const trackChanges = compareTrackChanges(oldVersion, newVersion);
        
        // Store track changes in summary
        result.summary.addedTracks = trackChanges.added.map(t => t.name);
        result.summary.removedTracks = trackChanges.removed.map(t => t.name);
        result.summary.modifiedTracks = trackChanges.modified.map(t => t.name);
        
        // Add specific track additions/removals to result
        if (!result.trackAddRemove) {
            result.trackAddRemove = [];
        }
        
        // Add "added track" entries
        trackChanges.added.forEach(track => {
            result.trackAddRemove.push({
                type: 'added',
                trackName: track.name,
                trackType: track.type,
                description: `Added ${track.type} track '${track.name}'`
            });
            result.summary.totalChanges++;
        });
        
        // Add "removed track" entries
        trackChanges.removed.forEach(track => {
            result.trackAddRemove.push({
                type: 'removed',
                trackName: track.name,
                trackType: track.type,
                description: `Removed ${track.type} track '${track.name}'`
            });
            result.summary.totalChanges++;
        });

        // Get tracks that exist in both versions for detailed comparison
        const commonTrackIds = new Set();
        oldVersion.tracks.forEach(track => {
            if (newVersion.tracks.some(t => t.id === track.id)) {
                commonTrackIds.add(track.id);
            }
        });

        // Apply track-level comparators for each track pair
        commonTrackIds.forEach(trackId => {
            const oldTrack = oldVersion.tracks.find(t => t.id === trackId);
            const newTrack = newVersion.tracks.find(t => t.id === trackId);
            
            if (!oldTrack || !newTrack) return; // Safety check
            
            const trackName = newTrack.name;
            
            // Process each track with all track-level comparators
            this.trackLevelComparators.forEach(comparator => {
                const changes = comparator.compare(oldTrack, newTrack, trackName);
                
                if (changes && changes.length > 0) {
                    result[comparator.type].push(...changes);
                    result.summary.totalChanges += changes.length;
                    
                    // Add to changed tracks if not already there
                    if (!result.summary.changedTracks.includes(trackName)) {
                        result.summary.changedTracks.push(trackName);
                    }
                }
            });
        });
        
        return result;
    }
}

// Create the main diff engine instance
const diffEngine = new DiffEngine();

// Define and register track-level comparators
// ==================================================

/**
 * MIDI Note Comparator - Detects changes in MIDI note positions and durations
 */
/**
 * MIDI Note Comparator - Simplified to just track added and removed notes
 */
diffEngine.registerTrackComparator({
  type: 'noteChanges',
  compare: (oldTrack, newTrack, trackName) => {
      const changes = [];
      
      // Skip if either track doesn't have events or notes
      if (!oldTrack.events || !newTrack.events) return changes;
      
      // Collect all notes from old track with their positions
      const oldNotes = [];
      oldTrack.events.forEach(oldEvent => {
          if (!oldEvent.notes) return;
          
          const eventStart = parseFloat(oldEvent.start);
          oldEvent.notes.forEach(note => {
              note.occurences.forEach(occ => {
                  if (occ.enabled === "false") return;
                  
                  const globalBeat = eventStart + parseFloat(occ.start);
                  oldNotes.push({
                      eventStart,
                      beat: globalBeat,
                      pitch: note.key.Value,
                      duration: parseFloat(occ.duration),
                      velocity: parseFloat(occ.velocity)
                  });
              });
          });
      });
      
      // Collect all notes from new track with their positions
      const newNotes = [];
      newTrack.events.forEach(newEvent => {
          if (!newEvent.notes) return;
          
          const eventStart = parseFloat(newEvent.start);
          newEvent.notes.forEach(note => {
              note.occurences.forEach(occ => {
                  if (occ.enabled === "false") return;
                  
                  const globalBeat = eventStart + parseFloat(occ.start);
                  newNotes.push({
                      eventStart,
                      beat: globalBeat,
                      pitch: note.key.Value,
                      duration: parseFloat(occ.duration),
                      velocity: parseFloat(occ.velocity)
                  });
              });
          });
      });
      
      // Find removed notes (in old but not in new)
      oldNotes.forEach(oldNote => {
          // Try to find a matching note in the new track
          const matchFound = newNotes.some(newNote => 
              // Match on position, pitch, and similar duration
              Math.abs(newNote.beat - oldNote.beat) < 0.1 && 
              newNote.pitch === oldNote.pitch &&
              Math.abs(newNote.duration - oldNote.duration) < 0.1
          );
          
          if (!matchFound) {
              changes.push({
                  type: 'noteRemoved',
                  trackName,
                  note: oldNote.pitch,
                  beat: oldNote.beat,
                  description: `Note ${oldNote.pitch} at beat ${oldNote.beat.toFixed(2)} was removed from track '${trackName}'`
              });
          }
      });
      
      // Find added notes (in new but not in old)
      newNotes.forEach(newNote => {
          // Try to find a matching note in the old track
          const matchFound = oldNotes.some(oldNote => 
              // Match on position, pitch, and similar duration
              Math.abs(newNote.beat - oldNote.beat) < 0.1 && 
              newNote.pitch === oldNote.pitch &&
              Math.abs(newNote.duration - oldNote.duration) < 0.1
          );
          
          if (!matchFound) {
              changes.push({
                  type: 'noteAdded',
                  trackName,
                  note: newNote.pitch,
                  beat: newNote.beat,
                  description: `Note ${newNote.pitch} at beat ${newNote.beat.toFixed(2)} was added to track '${trackName}'`
              });
          }
      });
      
      return changes;
  }
});

/**
 * Note Velocity Comparator - Detects changes in MIDI note velocities
 */
diffEngine.registerTrackComparator({
    type: 'velocityChanges',
    compare: (oldTrack, newTrack, trackName) => {
        const changes = [];
        
        // Skip if either track doesn't have events
        if (!oldTrack.events || !newTrack.events) return changes;
        
        oldTrack.events.forEach(oldEvent => {
            if (!oldEvent.notes) return;
            
            // Find matching event in newTrack
            const matchingNewEvents = newTrack.events.filter(e => 
                Math.abs(parseFloat(e.start) - parseFloat(oldEvent.start)) < 1 &&
                e.notes
            );
            
            matchingNewEvents.forEach(matchingNewEvent => {
                // Compare notes
                oldEvent.notes.forEach(oldNote => {
                    const matchingNewNotes = matchingNewEvent.notes.filter(n => 
                        n.key.Value === oldNote.key.Value
                    );
                    
                    matchingNewNotes.forEach(matchingNewNote => {
                        // Compare occurrences
                        oldNote.occurences.forEach((oldOcc, occIndex) => {
                            // Try to find matching occurrence
                            const newOcc = matchingNewNote.occurences[occIndex] || 
                                          matchingNewNote.occurences.find(o => 
                                            Math.abs(parseFloat(o.start) - parseFloat(oldOcc.start)) < 0.5);
                            
                            if (newOcc && oldOcc.velocity !== newOcc.velocity) {
                                const vel1 = parseFloat(oldOcc.velocity);
                                const vel2 = parseFloat(newOcc.velocity);
                                changes.push({
                                    type: 'velocity',
                                    trackName,
                                    note: oldNote.key.Value,
                                    from: vel1,
                                    to: vel2,
                                    description: `Note ${oldNote.key.Value} velocity changed from ${vel1.toFixed(0)} to ${vel2.toFixed(0)} in track '${trackName}'`
                                });
                            }
                        });
                    });
                });
            });
        });
        
        return changes;
    }
});

/**
 * Track Parameters Comparator - Detects changes in track parameters (volume, etc)
 */
diffEngine.registerTrackComparator({
    type: 'trackParameterChanges',
    compare: (oldTrack, newTrack, trackName) => {
        const changes = [];
        
        // Compare volume
        if (oldTrack.volume !== newTrack.volume) {
            const vol1 = parseFloat(oldTrack.volume);
            const vol2 = parseFloat(newTrack.volume);
            changes.push({
                type: 'volume',
                trackName,
                parameter: 'volume',
                from: vol1,
                to: vol2,
                description: `Volume for '${trackName}' changed from ${vol1.toFixed(3)} to ${vol2.toFixed(3)}`
            });
        }
        
        // Compare volumeMin
        if (oldTrack.volumeMin !== newTrack.volumeMin) {
            const min1 = parseFloat(oldTrack.volumeMin);
            const min2 = parseFloat(newTrack.volumeMin);
            changes.push({
                type: 'volumeMin',
                trackName,
                parameter: 'volumeMin',
                from: min1,
                to: min2,
                description: `Minimum volume for '${trackName}' changed from ${min1.toFixed(3)} to ${min2.toFixed(3)}`
            });
        }
        
        // Compare volumeMax
        if (oldTrack.volumeMax !== newTrack.volumeMax) {
            const max1 = parseFloat(oldTrack.volumeMax);
            const max2 = parseFloat(newTrack.volumeMax);
            changes.push({
                type: 'volumeMax',
                trackName,
                parameter: 'volumeMax',
                from: max1,
                to: max2,
                description: `Maximum volume for '${trackName}' changed from ${max1.toFixed(3)} to ${max2.toFixed(3)}`
            });
        }
        
        // Add more parameter comparisons as needed
        
        return changes;
    }
});

/**
 * Loop Settings Comparator - Detects changes in loop settings
 */
diffEngine.registerTrackComparator({
    type: 'loopChanges',
    compare: (oldTrack, newTrack, trackName) => {
        const changes = [];
        
        if (!oldTrack.events || !newTrack.events) return changes;
        
        oldTrack.events.forEach(oldEvent => {
            if (!oldEvent.loop) return;
            
            // Find matching event in newTrack
            const matchingNewEvent = newTrack.events.find(e => 
                Math.abs(parseFloat(e.start) - parseFloat(oldEvent.start)) < 1 &&
                e.loop
            );
            
            if (matchingNewEvent) {
                const oldLoop = oldEvent.loop;
                const newLoop = matchingNewEvent.loop;
                
                // Check loop points
                if (oldLoop.start !== newLoop.start || oldLoop.end !== newLoop.end) {
                    changes.push({
                        type: 'loopPoints',
                        trackName,
                        from: { start: parseFloat(oldLoop.start), end: parseFloat(oldLoop.end) },
                        to: { start: parseFloat(newLoop.start), end: parseFloat(newLoop.end) },
                        description: `Loop points changed from ${oldLoop.start}-${oldLoop.end} to ${newLoop.start}-${newLoop.end} in track '${trackName}'`
                    });
                }
                
                // Check if loop was enabled/disabled
                if (oldLoop.on !== newLoop.on) {
                    changes.push({
                        type: 'loopEnabled',
                        trackName,
                        from: oldLoop.on === "true",
                        to: newLoop.on === "true",
                        description: `Loop ${newLoop.on === "true" ? "enabled" : "disabled"} in track '${trackName}'`
                    });
                }
            }
        });
        
        return changes;
    }
});

/**
 * Audio Files Comparator - Detects changes in audio files and clips
 */
diffEngine.registerTrackComparator({
    type: 'audioFileChanges',
    compare: (oldTrack, newTrack, trackName) => {
        const changes = [];
        
        // Skip non-audio tracks
        if (oldTrack.type !== "AudioTrack" || newTrack.type !== "AudioTrack") {
            return changes;
        }
        
        // Compare main audio file
        if (oldTrack.audio_file !== newTrack.audio_file) {
            changes.push({
                type: 'audioSource',
                trackName,
                from: oldTrack.audio_file || 'none',
                to: newTrack.audio_file || 'none',
                description: `Audio source changed for track '${trackName}'`
            });
        }
        
        // Compare audio clips within events
        if (oldTrack.events && newTrack.events) {
            oldTrack.events.forEach(oldEvent => {
                if (!oldEvent.audio_name) return;
                
                // Find matching event in new track
                const matchingNewEvent = newTrack.events.find(e => 
                    Math.abs(parseFloat(e.start) - parseFloat(oldEvent.start)) < 1
                );
                
                if (matchingNewEvent && oldEvent.audio_name !== matchingNewEvent.audio_name) {
                    changes.push({
                        type: 'audioClip',
                        trackName,
                        from: oldEvent.audio_name,
                        to: matchingNewEvent.audio_name,
                        position: parseFloat(oldEvent.start),
                        description: `Audio clip at beat ${parseFloat(oldEvent.start).toFixed(1)} changed from '${oldEvent.audio_name}' to '${matchingNewEvent.audio_name}' in track '${trackName}'`
                    });
                }
            });
        }
        
        return changes;
    }
});/**
* Generates an LLM-friendly summary of the detailed diff
* 
* This creates a concise representation of changes optimized for sending to LLMs,
* focusing on meaningful patterns while avoiding excessive detail that would 
* make the input too large for effective processing.
* 
* @param {Object} detailedDiff - The full detailed diff object
* @returns {Object} An LLM-optimized summary of the changes
*/
DiffEngine.prototype.generateLLMSummary = function(detailedDiff) {
 const summary = {
     projectChanges: [], // High-level changes
     trackSummaries: {}, // Per-track summaries
     stats: {           // Statistical aggregation
         tracksAdded: detailedDiff.summary.addedTracks.length,
         tracksRemoved: detailedDiff.summary.removedTracks.length,
         tracksModified: detailedDiff.summary.modifiedTracks.length,
         totalChanges: detailedDiff.summary.totalChanges
     }
 };
 
 // Include added/removed tracks as high-level changes
 if (detailedDiff.trackAddRemove) {
     detailedDiff.trackAddRemove.forEach(change => {
         summary.projectChanges.push(change.description);
     });
 }
 
 // Process all modified tracks
 detailedDiff.summary.modifiedTracks.forEach(trackName => {
     const trackSummary = {
         noteChanges: 0,
         velocityChanges: 0, 
         parameterChanges: 0,
         loopChanges: 0,
         audioChanges: 0,
         significantChanges: []  // Will contain most important changes for this track
     };
     
     // Count changes by type
     if (detailedDiff.noteChanges) {
         const trackNoteChanges = detailedDiff.noteChanges.filter(c => c.trackName === trackName);
         trackSummary.noteChanges = trackNoteChanges.length;
         
         // Group note position changes to detect patterns
         const positionChanges = trackNoteChanges.filter(c => c.type === 'position');
         if (positionChanges.length > 3) {
             // If many notes moved by the same amount, summarize as pattern
             const shiftAmounts = positionChanges.map(c => c.to - c.from);
             const avgShift = shiftAmounts.reduce((sum, val) => sum + val, 0) / shiftAmounts.length;
             
             if (Math.abs(avgShift) > 0.1) {
                 const direction = avgShift > 0 ? "later" : "earlier";
                 trackSummary.significantChanges.push(
                     `${positionChanges.length} notes moved ${direction} by ~${Math.abs(avgShift).toFixed(2)} beats`
                 );
             }
         } else if (positionChanges.length > 0) {
             // For fewer changes, include them directly
             positionChanges.slice(0, 2).forEach(change => {
                 trackSummary.significantChanges.push(change.description);
             });
         }
         
         // Do the same for duration changes
         const durationChanges = trackNoteChanges.filter(c => c.type === 'duration');
         if (durationChanges.length > 0) {
             if (durationChanges.length > 3) {
                 const lengthChanges = durationChanges.map(c => c.to - c.from);
                 const avgChange = lengthChanges.reduce((sum, val) => sum + val, 0) / lengthChanges.length;
                 
                 if (Math.abs(avgChange) > 0.1) {
                     const direction = avgChange > 0 ? "lengthened" : "shortened";
                     trackSummary.significantChanges.push(
                         `${durationChanges.length} notes ${direction} by ~${Math.abs(avgChange).toFixed(2)} beats`
                     );
                 }
             } else {
                 durationChanges.slice(0, 2).forEach(change => {
                     trackSummary.significantChanges.push(change.description);
                 });
             }
         }
     }
     
     // Count and summarize velocity changes
     if (detailedDiff.velocityChanges) {
         const trackVelocityChanges = detailedDiff.velocityChanges.filter(c => c.trackName === trackName);
         trackSummary.velocityChanges = trackVelocityChanges.length;
         
         if (trackVelocityChanges.length > 3) {
             const velocityChanges = trackVelocityChanges.map(c => c.to - c.from);
             const avgChange = velocityChanges.reduce((sum, val) => sum + val, 0) / velocityChanges.length;
             
             if (Math.abs(avgChange) > 3) {
                 const direction = avgChange > 0 ? "increased" : "decreased";
                 trackSummary.significantChanges.push(
                     `${trackVelocityChanges.length} note velocities ${direction} by ~${Math.abs(avgChange).toFixed(0)}`
                 );
             }
         } else if (trackVelocityChanges.length > 0) {
             trackVelocityChanges.slice(0, 2).forEach(change => {
                 trackSummary.significantChanges.push(change.description);
             });
         }
     }
     
     // Count and summarize track parameter changes
     if (detailedDiff.trackParameterChanges) {
         const paramChanges = detailedDiff.trackParameterChanges.filter(c => c.trackName === trackName);
         trackSummary.parameterChanges = paramChanges.length;
         
         // Always include parameter changes as they're usually few but significant
         paramChanges.forEach(change => {
             trackSummary.significantChanges.push(change.description);
         });
     }
     
     // Count and summarize loop changes
     if (detailedDiff.loopChanges) {
         const loopChanges = detailedDiff.loopChanges.filter(c => c.trackName === trackName);
         trackSummary.loopChanges = loopChanges.length;
         
         loopChanges.forEach(change => {
             trackSummary.significantChanges.push(change.description);
         });
     }
     
     // Count and summarize audio file changes
     if (detailedDiff.audioFileChanges) {
         const audioChanges = detailedDiff.audioFileChanges.filter(c => c.trackName === trackName);
         trackSummary.audioChanges = audioChanges.length;
         
         audioChanges.forEach(change => {
             trackSummary.significantChanges.push(change.description);
         });
     }
     
     // Only add tracks that have significant changes
     if (trackSummary.significantChanges.length > 0) {
         summary.trackSummaries[trackName] = trackSummary;
     }
 });
 
 // Create a text summary suitable for direct LLM consumption
 const llmText = this.generateLLMTextSummary(summary);
 summary.llmText = llmText;
 
 return summary;
};

/**
* Generates a textual summary for LLM consumption
* 
* @param {Object} summary - The structured summary object
* @returns {string} A concise text description of changes
*/
DiffEngine.prototype.generateLLMTextSummary = function(summary) {
 const parts = [];
 
 // Project-level changes
 if (summary.stats.tracksAdded > 0 || summary.stats.tracksRemoved > 0) {
     parts.push(`Overall project changes: ${summary.stats.tracksAdded} tracks added, ${summary.stats.tracksRemoved} tracks removed, ${summary.stats.tracksModified} tracks modified.`);
     
     if (summary.projectChanges.length > 0) {
         parts.push(summary.projectChanges.join('\n'));
     }
 }
 
 // Track-specific changes
 const trackNames = Object.keys(summary.trackSummaries);
 if (trackNames.length > 0) {
     parts.push(`\nDetailed changes by track:`);
     
     trackNames.forEach(trackName => {
         const trackSummary = summary.trackSummaries[trackName];
         
         // Add track header with counts
         const changeTypes = [];
         if (trackSummary.noteChanges > 0) changeTypes.push(`${trackSummary.noteChanges} note changes`);
         if (trackSummary.velocityChanges > 0) changeTypes.push(`${trackSummary.velocityChanges} velocity changes`);
         if (trackSummary.parameterChanges > 0) changeTypes.push(`${trackSummary.parameterChanges} parameter changes`);
         if (trackSummary.loopChanges > 0) changeTypes.push(`${trackSummary.loopChanges} loop changes`);
         if (trackSummary.audioChanges > 0) changeTypes.push(`${trackSummary.audioChanges} audio changes`);
         
         parts.push(`\nTrack: "${trackName}" (${changeTypes.join(", ")})`);
         
         // Add significant changes
         if (trackSummary.significantChanges.length > 0) {
             // Limit to 5 most significant changes per track to avoid excessive length
             const limitedChanges = trackSummary.significantChanges.slice(0, 5);
             
             if (trackSummary.significantChanges.length > 5) {
                 limitedChanges.push(`...and ${trackSummary.significantChanges.length - 5} more changes`);
             }
             
             parts.push(limitedChanges.map(change => `  - ${change}`).join('\n'));
         }
     });
 }
 
 // Final stats
 parts.push(`\nTotal changes: ${summary.stats.totalChanges}`);
 
 return parts.join('\n');
};

// Additional comparators can be registered here or imported from separate files
// diffEngine.registerTrackComparator(require('./comparators/effectsComparator'));

/**
* Create a detailed diff between project versions using the diff engine
* @param {Object} oldVersion - Previous version of the project
* @param {Object} newVersion - Current version of the project
* @returns {Object} Detailed diff object
*/
function getDetailedProjectDiff(oldVersion, newVersion, includeLLMSummary = true) {
 const detailedDiff = diffEngine.createDetailedDiff(oldVersion, newVersion);
   
 // Add LLM-friendly summary if requested
 if (includeLLMSummary) {
     detailedDiff.llmSummary = diffEngine.generateLLMSummary(detailedDiff);
 }
 
 return detailedDiff;
}

module.exports = {
    compareTrackChanges,
    getDetailedProjectDiff,
    diffEngine // Export the engine to allow registering custom comparators
};