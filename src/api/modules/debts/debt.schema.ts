import { model } from 'mongoose';
import Schema from '../../services/custom-mongoose-types.service';



const debtsSchema = new Schema({
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    type: Schema.Types['DebtsType'],

    countryCode: String,

    status: Schema.Types['StatusCodeDebts'],
    statusAcceptor: { type: Schema.Types.ObjectId, ref: 'User' },

    summary: Number,
    moneyReceiver: { type: Schema.Types.ObjectId, ref: 'User' },

    moneyOperations: [{ type: Schema.Types.ObjectId, ref: 'MoneyOperation' }]
}, { timestamps: true });


const Debts = model('Debts', debtsSchema);
export default Debts;