import { models } from './models'

const {User, Org} = models

export const getters = {
  userMap: User.currentValues,
  newUsers: User.newRecords,
  changedUsers: User.changedRecords,
  deletedUsers: User.deletedRecords,
}
