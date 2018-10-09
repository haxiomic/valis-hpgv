/**
 * Should be plain-old-data and easy to serialize
 * - Should encapsulate complete state, excluding transitive UI state
 * - Applying a TrackModel state should restore state exactly
 */
export type TrackModel = {
    type: string;
    name: string;
};

export default TrackModel;