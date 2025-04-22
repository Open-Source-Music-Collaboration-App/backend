/**
 * Constants used for upload actions
 */
const UploadAction = Object.freeze({
    COMMIT: "COMMIT",
    COLLAB_REQ: "COLLAB_REQUEST"
})
/**
 * Constants used for reviewing collaboration requests
 */
const CollabReqStatus = Object.freeze({
    ACCEPTED: "accepted",
    REJECTED: "rejected",
    PENDING: "pending",
})


module.exports = { UploadAction, CollabReqStatus };