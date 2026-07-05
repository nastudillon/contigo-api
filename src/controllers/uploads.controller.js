const uploadsService = require('../services/uploads.service');
const { successResponse } = require('../utils/responses');

const uploadAvatar = async (req, res, next) => {
  try {
    const { image, target } = req.body;
    const result = await uploadsService.uploadAvatar({
      userId: req.user.id,
      role: req.user.role,
      image,
      target,
    });

    return successResponse(res, 'Imagen subida exitosamente', result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadAvatar,
};
