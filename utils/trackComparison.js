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
diffEngine.registerTrackComparator({
    type: 'noteChanges',
    compare: (oldTrack, newTrack, trackName) => {
        const changes = [];
        
        // Skip if either track doesn't have events or notes
        if (!oldTrack.events || !newTrack.events) return changes;
        
        oldTrack.events.forEach(oldEvent => {
            if (!oldEvent.notes) return;
            
            // Find matching event in newTrack based on position
            const matchingNewEvents = newTrack.events.filter(e => 
                // Similar event position (with some tolerance for slight changes)
                Math.abs(parseFloat(e.start) - parseFloat(oldEvent.start)) < 1 &&
                Math.abs(parseFloat(e.end) - parseFloat(oldEvent.end)) < 1 &&
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
                            
                            if (newOcc) {
                                // Check if the start position changed
                                if (oldOcc.start !== newOcc.start) {
                                    const beat1 = parseFloat(oldOcc.start);
                                    const beat2 = parseFloat(newOcc.start);
                                    changes.push({
                                        type: 'position',
                                        trackName,
                                        note: oldNote.key.Value,
                                        from: beat1,
                                        to: beat2,
                                        description: `Note ${oldNote.key.Value} moved from beat ${beat1.toFixed(2)} to beat ${beat2.toFixed(2)} in track '${trackName}'`
                                    });
                                }
                                
                                // Check duration changes
                                if (oldOcc.duration !== newOcc.duration) {
                                    const dur1 = parseFloat(oldOcc.duration);
                                    const dur2 = parseFloat(newOcc.duration);
                                    changes.push({
                                        type: 'duration',
                                        trackName,
                                        note: oldNote.key.Value,
                                        from: dur1,
                                        to: dur2,
                                        description: `Note ${oldNote.key.Value} duration changed from ${dur1.toFixed(2)} to ${dur2.toFixed(2)} beats in track '${trackName}'`
                                    });
                                }
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
});

// Additional comparators can be registered here or imported from separate files
// diffEngine.registerTrackComparator(require('./comparators/effectsComparator'));

/**
 * Create a detailed diff between project versions using the diff engine
 * @param {Object} oldVersion - Previous version of the project
 * @param {Object} newVersion - Current version of the project
 * @returns {Object} Detailed diff object
 */
function getDetailedProjectDiff(oldVersion, newVersion) {
    return diffEngine.createDetailedDiff(oldVersion, newVersion);
}

module.exports = {
    compareTrackChanges,
    getDetailedProjectDiff,
    diffEngine // Export the engine to allow registering custom comparators
};