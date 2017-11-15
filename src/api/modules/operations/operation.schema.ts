import { model } from 'mongoose';
import Schema from '../../services/custom-mongoose-types.service';


const operationsSchema = new Schema({
    debtsId: { type: Schema.Types.ObjectId, ref: 'Debts' },
    date: { type: Date, default: Date.now },
    moneyAmount: Number,
    moneyReceiver: { type: Schema.Types.ObjectId, ref: 'User' },
    description: String,
    status: Schema.Types['StatusCodeOperations'],
    statusAcceptor: { type: Schema.Types.ObjectId, ref: 'User' }
});

const Operation = model('MoneyOperation', operationsSchema);

export default Operation;