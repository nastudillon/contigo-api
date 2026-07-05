const elderlyRepo = require('../repositories/elderly.repository');

const list = async (userId) => {
  return elderlyRepo.findByUserId(userId);
};

const saveAll = async (userId, seniors) => {
  if (!Array.isArray(seniors)) seniors = [];
  await elderlyRepo.replaceAll(userId, seniors);
  return elderlyRepo.findByUserId(userId);
};

module.exports = { list, saveAll };
