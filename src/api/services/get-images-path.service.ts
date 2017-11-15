import { Request } from 'express';

const getImagesPath = (req: Request): string => req.protocol + '://' + req.get('host') + '/images/';

export {getImagesPath};