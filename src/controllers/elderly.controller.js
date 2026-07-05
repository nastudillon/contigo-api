const elderlyService = require('../services/elderly.service');
const { successResponse } = require('../utils/responses');

const list = async (req, res, next) => {
  try {
    const seniors = await elderlyService.list(req.user.id);
    return successResponse(res, 'Adultos mayores obtenidos', { seniors });
  } catch (err) {
    next(err);
  }
};

const saveAll = async (req, res, next) => {
  try {
    const { seniors } = req.body;
    const result = await elderlyService.saveAll(req.user.id, seniors);
    return successResponse(res, 'Adultos mayores guardados', { seniors: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, saveAll };
