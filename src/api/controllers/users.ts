import { default as User, SendUser, UserModel } from '../models/User';
import { Request, Response } from 'express';
import * as multerConfig from '../helpers/multer';
import * as path from 'path';
import * as multer from 'multer';
import { errorHandler } from '../helpers/error-handler';
import Debts from '../models/Debts';


/*
 * GET
 * /users
 */
export let getUsersArrayByName = (req: any, res: Response) => {
    const name = req.swagger ? req.swagger.params.name.value : req.query.name;

    if (!name || name.length === 0) {
        return errorHandler(req, res, 'Name must not be empty');
    }

    const userId = req.user.id;

    Debts
        .find({'users': {'$all': [userId]}})
        .populate({ path: 'users', select: 'name picture'})
        .exec()
        .then((debts: any) => {
            const usedUserIds = debts.map(debt => debt.users.find(user => user.id != userId).id);

            User.find({'name': new RegExp(name, 'i')}).limit(15).exec().then((users: UserModel[]) => {
                const sendUsers = users
                    .filter(user => {
                        return user.id != userId && !usedUserIds.find(id => user.id == id);
                    })
                    .map(user => {
                        return {
                            id: user.id,
                            name: user.name,
                            picture: user.picture
                        };
                    });

                res.status(200);
                res.json(sendUsers);
            });
        })
        .catch(err => errorHandler(req, res, err));
};

/*
 * POST
 * /users
 * @header Content-Type multipart/form-data
 * @param name String Name of user
 * @param image File User's avatar
 */
export let updateUserData = (req, res) => {
    req.assert('name', 'Name field should not be empty').notEmpty();

    const errors = req.validationErrors();

    if (errors) {
        return errorHandler(req, res, errors);
    }

    const name = req.swagger ? req.swagger.params.name.value : req.body.name;
    const userId = req.user.id;

    const userInfo: any = {name};

    if(req.file && req.file.filename) {
        userInfo.picture = req.protocol + '://' + req.get('host') + '/images/' + req.file.filename;
    }


    return User.findByIdAndUpdate(userId, userInfo)
        .then((resp: any) => {
            if(!resp) {
                return errorHandler(req, res, 'User not found');
            }

            const user = new SendUser(resp.id, userInfo.name, userInfo.picture || resp.picture);

            res.status(200);
            return res.json(user);
        }).catch(err => errorHandler(req, res, err));
};

export let checkUserProfile = (req, res, next) => {
    const userId = req.user.id;

    if(userId != req.params.id) {
        return errorHandler(req, res, 'You cannot modify another user\'s profile');
    }

    next();
};

export let uploadImage = (req, res, next) => {
    const upload = multer({
        storage: multerConfig.multerStorage(),
        fileFilter: function(req, file, callback) {
            const ext = path.extname(file.originalname);
            if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
                return callback(res.json({error: 'Only images are allowed'}), null);
            }
            callback(null, true);
        },
        fieldSize: 512
    }).single('image');

    upload(req, res, err => {
        if(err) {
            res.status(400);
            return err;
        }

        next();
    });
};