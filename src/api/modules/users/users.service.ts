import Debts from '../debts/debt.schema';
import { Id } from '../../common/types';
import { DebtInterface } from '../debts/debt.interface';
import User from './user.schema';
import { UserInterface } from './user.interface';
import { SendUserDto, UpdateUserDataDto } from './user.dto';


export class UsersService {
    
    getUsersByName = (name: string, userId: Id): Promise<SendUserDto[]> => {
        let usedUserIds: Id[];

        return Debts
            .find({'users': {'$all': [userId]}})
            .populate({ path: 'users', select: 'name picture'})
            .exec()
            .then((debts: DebtInterface[]) => {
                usedUserIds = debts
                    .map(debt => debt.users.find(user => user['id'].toString() != userId)['id']);

                return User
                    .find({
                        'name': new RegExp(name, 'i'),
                        virtual: false
                    })
                    .limit(15)
                    .exec();
            })
            .then((users: UserInterface[]) => {
                return users
                    .filter(user => user.id != userId && !usedUserIds.find(id => user.id == id))
                    .map(user => new SendUserDto(user.id, user.name, user.picture));
            });
    };

    updateUserData = (userId: Id, userInfo: UpdateUserDataDto): Promise<SendUserDto> => {
        return User
            .findByIdAndUpdate(userId, userInfo)
            .then((updatedUser: UserInterface) => {
                if(!updatedUser) {
                    throw new Error('User not found');
                }

                return new SendUserDto(updatedUser.id, userInfo.name, userInfo.picture || updatedUser.picture);
            });
    };
}