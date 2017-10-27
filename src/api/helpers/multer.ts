import * as multer from 'multer';
import * as path from 'path';

export let multerStorage = () => {
    return multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, 'public/images');
        },
        filename: function(req, file, callback) {
            callback(null, file.fieldname + '-' + Date.now() + Math.floor((Math.random() * 100)) + path.extname(file.originalname));
        }
    });
};