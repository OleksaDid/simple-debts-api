import * as nodemailer from 'nodemailer';
import * as mg from 'nodemailer-mailgun-transport';
import * as inLineCss from 'nodemailer-juice';

const transporter = nodemailer.createTransport(mg({
    auth: {
        api_key: process.env.EMAIL_API,
        domain: process.env.EMAIL_DOMAIN
    }
}));

export let mailerInit = () => {
    return transporter.use('compile', inLineCss());
};

export let passwordResetMessage = transporter.templateSender({
    subject: 'Simple Debts | Reset Password',
    html:
    '<style>' +
        'div {background-color: #58D27D; color: #343F4B}' +
        'h1 {width: 100%; padding: 30px 15px; background-color: #6EE0A1; color: white}' +
        'h2 {margin: 20px auto; padding: 10px; background-color: #969FAA;}' +
    '</style>' +
    '<div>' +
        '<h1>Hi, {{username}}!</h1>' +
        '<p>You are receiving this because you (or someone else) have requested the reset of the password for your Simple Debts account.<br>' +
        'Please enter this code in your app to complete the process:</p>' +
        '<h2>{{token}}</h2>' +
        '<p>If you did not request this, please ignore this email and your password will remain unchanged.</p>' +
    '</div>'
}, {
    from: 'mailer@simpledebts.com',
});