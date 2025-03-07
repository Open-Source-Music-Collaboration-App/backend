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
        console.log(oldTrack);
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

module.exports = { compareTrackChanges };