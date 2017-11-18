import { DebtInterface, DebtsAccountType, DebtsStatus } from './debt.interface';
import { Id } from '../../common/types';
import { UserInterface } from '../users/user.interface';
import User from '../users/user.schema';
import { CloneRealUserToVirtualDto, CreateVirtualUserDto } from '../users/user.dto';
import Debts from './debt.schema';
import Operation from '../operations/operation.schema';
import { OperationInterface, OperationStatus } from '../operations/operation.interface';
import {DebtDto, DebtsListDto} from './debt.dto';
import { UsersService } from '../users/users.service';



export class DebtsService {

    private usersService = new UsersService();



    createMultipleDebt = (creatorId: Id, userId: Id, countryCode: string): Promise<DebtInterface> => {
        return User
            .findById(userId)
            .exec()
            .then((user: UserInterface) => {
                if(!user) {
                    throw new Error('User is not found');
                }

                return Debts
                    .findOne({'users': {'$all': [userId, creatorId]}})
                    .exec();
            })
            .then((debts: DebtInterface) => {
                if(debts) {
                    throw new Error('Such debts object is already created');
                }

                const newDebts = new DebtDto(creatorId, userId, DebtsAccountType.MULTIPLE_USERS, countryCode);

                return Debts
                    .create(newDebts)
                    .then((debt: DebtInterface) => debt);
            });
    };

    createSingleDebt = (creatorId: Id, userName: string, countryCode: string, imagesPath: string): Promise<DebtInterface> => {
        const virtUser = new CreateVirtualUserDto(userName);

        return Debts
            .find({'users': {'$all': [creatorId]}, 'type': DebtsAccountType.SINGLE_USER})
            .populate({ path: 'users', select: 'name virtual'})
            .lean()
            .then((debts: DebtInterface[]) => {
                if(
                    debts &&
                    debts.length > 0 &&
                    debts.some(debt => !!debt.users.find(user => user['name'] === userName && user['virtual']))
                ) {
                    throw new Error('You already have virtual user with such name');
                }

                return User.create(virtUser);
            })
            .then((user: UserInterface) => {

                const newUser: any = new User();

                return newUser.generateIdenticon(user.id)
                    .then(image => {
                        user.picture = imagesPath + image;
                        return user.save();
                    })
                    .then(() => Debts.create(new DebtDto(creatorId, user._id, DebtsAccountType.SINGLE_USER, countryCode)));
            });
    };
    
    deleteMultipleDebts = (debt: DebtInterface, userId: Id): Promise<void> => {
        const deletedUserInfo = debt.users.find(user => user['_id'].toString() === userId.toString());

        let createdVirtualUser: UserInterface;


        return User.create([
            new CloneRealUserToVirtualDto(deletedUserInfo['name'], deletedUserInfo['picture'])
        ])
            .then((user: UserInterface[]) => {
                createdVirtualUser = user[0];

                return Debts.findByIdAndUpdate(debt.id, {
                    type: DebtsAccountType.SINGLE_USER,
                    status: DebtsStatus.USER_DELETED,
                    $pull: {'users': userId}
                });
            })
            .then((debt: DebtInterface) => {
                debt.statusAcceptor = debt.users.find(user => user.toString() !== userId.toString());
                debt.users.push(createdVirtualUser._id);

                const promises = [];
                debt['moneyOperations']
                    .forEach(operationId => promises.push(Operation.findById(operationId)));

                return debt
                    .save()
                    .then(() => Promise.all(promises));
            })
            .then((operations: OperationInterface[]) => {
                const promises = operations.map(operation => {
                    if(operation.moneyReceiver.toString() === userId.toString()) {
                        operation.moneyReceiver = createdVirtualUser._id;
                    }
                    if(operation.statusAcceptor.toString() === userId.toString()) {
                        operation.statusAcceptor = null;
                        operation.status = OperationStatus.UNCHANGED;
                    }
                    return operation.save();
                });

                return Promise.all(promises)
                    .then(() => {}); // transform an array of promises into 1 promise
            });
    };

    deleteSingleDebt = (debt: DebtInterface, userId: Id): Promise<void> => {
        const virtualUserId = debt.users.find(user => user['_id'].toString() != userId);

        return debt
            .remove()
            .then(() => this.usersService.deleteUser(virtualUserId));
    };

    getAllUserDebts = (userId: Id): Promise<DebtsListDto> => {
        return Debts
            .find({
                $or: [
                    {users: {'$all': [userId]}},
                    {status: DebtsStatus.CONNECT_USER, statusAcceptor: userId}
                ]
            })
            .populate({ path: 'users', select: 'name picture virtual'})
            .sort({status: 1, updatedAt: -1})
            .lean()
            .then((debts: DebtInterface[]) => {
                if(debts) {
                    const debtsArray = debts.map(debt => this.formatDebt(debt, userId, false));

                    return new DebtsListDto(debtsArray, userId);
                }
            });
    };

    getDebtsById = (userId: Id, debtsId: Id) => {
        return Debts
            .findById(debtsId)
            .populate({
                path: 'moneyOperations',
                select: 'date moneyAmount moneyReceiver description status statusAcceptor',
                options: { sort: { 'date': -1 } }
            })
            .populate({ path: 'users', select: 'name picture virtual'})
            .lean()
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debts with id ' + debtsId + ' is not found');
                }

                return this.formatDebt(debt, userId, true);
            });
    };
    
    deleteDebt = (userId: Id, debtsId: Id): Promise<void> => {
        return Debts
            .findOne({_id: debtsId, users: {$in: [userId]}})
            .populate({ path: 'users', select: 'name picture'})
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debts not found');
                }

                if(debt.type === DebtsAccountType.SINGLE_USER) {
                    return this.deleteSingleDebt(debt, userId);
                } else if(debt.type === DebtsAccountType.MULTIPLE_USERS) {
                    return this.deleteMultipleDebts(debt, userId);
                }
            });  
    };
    
    acceptDebtsCreation = (userId: Id, debtsId: Id): Promise<void> => {
        return Debts
            .findOneAndUpdate(
                { _id: debtsId, status: DebtsStatus.CREATION_AWAITING, statusAcceptor: userId },
                { status: DebtsStatus.UNCHANGED, statusAcceptor: null }
            )
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debts not found');
                }
            });
    };

    declineDebtsCreation = (userId: Id, debtsId: Id): Promise<void> => {
        return Debts
            .findOneAndRemove({
                _id: debtsId,
                status: DebtsStatus.CREATION_AWAITING,
                users: {$in: [userId]}
            })
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debts not found');
                }
            });
    };

    acceptUserDeletedStatus = (userId: Id, debtsId: Id): Promise<DebtInterface> => {
        return Debts
            .findOne({
                _id: debtsId,
                type: DebtsAccountType.SINGLE_USER,
                status: DebtsStatus.USER_DELETED,
                statusAcceptor: userId
            })
            .populate({
                path: 'moneyOperations',
                select: 'status'
            })
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debt is not found');
                }

                if(!debt.moneyOperations ||
                    !debt.moneyOperations.length ||
                    debt.moneyOperations.every(operation => operation.status === OperationStatus.UNCHANGED)
                ) {
                    debt.status = DebtsStatus.UNCHANGED;
                    debt.statusAcceptor = null;
                } else {
                    debt.status = DebtsStatus.CHANGE_AWAITING;
                    debt.statusAcceptor = userId;
                }

                return debt.save();
            });
    };

    connectUserToSingleDebt = (userId: Id, connectUserId: Id, debtsId: Id): Promise<DebtInterface> => {
      return Debts
            .find({users: {$all: [userId, connectUserId]}})
            .lean()
            .then((debts: DebtInterface[]) => {
                if(debts && debts['length'] > 0) {
                    throw new Error('You already have Debt with this user');
                }

                return Debts
                    .findOne({_id: debtsId, type: DebtsAccountType.SINGLE_USER, users: {$in: [userId]}});
            })
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debt is not found');
                }

                if(debt.status === DebtsStatus.CONNECT_USER) {
                    throw new Error('Some user is already waiting for connection to this Debt');
                }

                if(debt.status === DebtsStatus.USER_DELETED) {
                    throw new Error('You can\'t connect user to this Debt until you resolve user deletion');
                }

                debt.status = DebtsStatus.CONNECT_USER;
                debt.statusAcceptor = connectUserId;

                return debt.save();
            });
    };

    acceptUserConnectionToSingleDebt = (userId: Id, debtsId: Id): Promise<void> => {
        return Debts
            .findOne({
                _id: debtsId,
                type: DebtsAccountType.SINGLE_USER,
                status: DebtsStatus.CONNECT_USER,
                statusAcceptor: userId
            })
            .populate('users', 'virtual')
            .then((debt: DebtInterface) => {
                const virtualUserId = debt.users.find(user => user['virtual']);

                debt.status = DebtsStatus.UNCHANGED;
                debt.type = DebtsAccountType.MULTIPLE_USERS;
                debt.statusAcceptor = null;

                if(debt.moneyReceiver === virtualUserId) {
                    debt.moneyReceiver = userId;
                }

                debt.users.push(userId);

                const promises = [];

                debt.moneyOperations.forEach(operation => {
                    promises.push(
                        Operation.findById(operation)
                            .then((op: OperationInterface) => {
                                if(op.moneyReceiver === virtualUserId) {
                                    op.moneyReceiver = userId;
                                }

                                return op.save();
                            })
                    );
                });

                promises.push(
                    this.usersService.deleteUser(virtualUserId)
                );

                promises.push(
                    Debts.findByIdAndUpdate(debtsId, {
                        $pull: {users: virtualUserId}
                    })
                );

                return debt.save().then(() => Promise.all(promises));
            })
            .then(() => {});
    };

    declineUserConnectionToSingleDebt = (userId: Id, debtsId: Id): Promise<void> => {
        return Debts
            .findOneAndUpdate(
                {
                    _id: debtsId,
                    type: DebtsAccountType.SINGLE_USER,
                    status: DebtsStatus.CONNECT_USER,
                    $or: [
                        {users: {$in: [userId]}},
                        {statusAcceptor: userId}
                    ]
                },
                {status: DebtsStatus.UNCHANGED, statusAcceptor: null})
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debt is not found');
                }
            });
    };


    
    private formatDebt(debt: DebtInterface, userId: Id, saveOperations: boolean) {
        let newDebt = debt;

        // make preview for user connect
        if(debt.status === DebtsStatus.CONNECT_USER && debt.statusAcceptor === userId) {
            const userToChange = newDebt.users.find(user => user['virtual']);

            newDebt = JSON.parse(JSON.stringify(newDebt).replace(userToChange['_id'].toString(), userId.toString()));
        }

        newDebt['user'] = newDebt.users.find(user => user['_id'].toString() != userId);
        newDebt['user'].id = newDebt['user']._id;
        newDebt.id = debt._id;
        delete newDebt._id;
        delete newDebt['user']._id;
        delete newDebt['user'].virtual;
        delete newDebt.users;
        delete newDebt.__v;
        delete newDebt['createdAt'];
        delete newDebt['updatedAt'];

        if(saveOperations) {
            newDebt.moneyOperations.forEach(operation => {
                operation.id = operation._id;
                delete operation._id;
            });
        } else {
            delete newDebt.moneyOperations;
        }

        return newDebt;
    }
}