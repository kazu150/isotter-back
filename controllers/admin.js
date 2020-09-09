const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator/check');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const User = require('../models/user');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: process.env.MAIL_KEY
    }
}));


const DEFAULT_THUMB = 'images/human.png'

exports.signup = async (req, res, next) => {

    try{
        const errs = validationResult(req);
        if(!errs.isEmpty()){
            const errorMessage = errs.errors[0].msg;
            const error = new Error(errorMessage)
            error.status = 422;
            throw error;
        }
        const userName = req.body.userName;
        const email = req.body.email
        const password = req.body.password;
        const thumb = req.body.thumb;

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = new User({
            userName: userName,
            email: email,
            password: hashedPassword,
            thumb: DEFAULT_THUMB
        })
        const savedUser = user.save();

        if(!savedUser){
            const error = new Error('ユーザー登録失敗');
            error.status = 500;
            throw error;
        }

        res.status(201).json({
            message: 'user successfully created',
            user: savedUser.userName
        })

        await transporter.sendMail({
            to: email,
            from: 'Isotter<noreply@isotter.com>',
            subject: 'Welcome to Isotter!',
            html: `<h1>${userName}さん、Isotterへようこそ！</h1>
            <p>Isotterではツイートを投稿したり、他の人のツイートを見たりすることができます！！<br>（残念ながら、今の所リツイートやリプライの機能はありません！笑）</p>`
        })
        
    } catch(err){
        next(err);
    }
};

// loginとuserStatusのcontrollerで、かなりやっていることがかぶっているので、リファクタの方法がわかったらしたい
exports.login = async (req,res,next) => {

    try{
        const errs = validationResult(req);
        if(!errs.isEmpty()){
            const errorMessage = errs.errors[0].msg;
            const error = new Error(errorMessage)
            if(errs.errors[0].param === 'userName'){
                error.status = 404;
            }else if(errs.errors[0].param === 'password'){
                error.status = 422;
            }
            throw error;
        }

        const token = jwt.sign(
            {
                email: req.user.email, 
                userId: req.user._id.toString(), 
                userName: req.user.userName
            }, 
            process.env.JWT_PW,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            token: token,
            userId: req.user._id.toString(),
            userName: req.user.userName
        })
    } catch(err) {
        next(err);
    }
}

exports.forgotPassword = (req, res, next) => {
    const errs = validationResult(req);
    if(!errs.isEmpty()){
        const errorMessage = errs.errors[0].msg;
        const error = new Error(errorMessage)
        error.status = 404;
        throw error;
    }

    crypto.randomBytes(32, (err, buffer) => {
        if(err){
            const errorMessage = errs.errors[0].msg;
            const error = new Error('パスワード再設定用トークン作成失敗')
            error.status = 403;
            throw error;
        }
        const token = buffer.toString('hex');
        User.findById(req.user._id)
            .then(user => {
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save()
            }).then(result => {
                return transporter.sendMail({
                    to: req.user.email,
                    from: 'Isotter<noreply@isotter.com>',
                    subject: 'Password Reset - Isotter',
                    html: `<p>こちらはIsotterです。パスワードのリセットを受付けました。</p>
                    <p>下記のURLからIsotterのパスワードの再設定をお願いします。<br>
                    <a href="https://isotter.herokuapp.com/reset-password/${token}">https://isotter.herokuapp.com/reset-password/${token}</a></p>`
                })
            })
            .then(result =>{
                return res.status(200).json({
                    email: req.user.email
                })
            })
            .catch(err => {
                err.status = 500;
                next(err);
            })
    })
}

exports.confirmResetToken = (req, res, next) => {
    const token = req.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            if(user){
                return res.status(201).json({
                    isValid: true
                })
            }else{
                return res.status(201).json({
                    isValid: false
                })
            }
        })
        .catch(err => next(err))
}

exports.resetPassword = (req, res, next) => {
    const token = req.params.token;
    const password = req.body.password;
    let userDoc;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            userDoc = user;
            return bcrypt.hash(password, 12)
        })
        .then(hashedPassword => {
            console.log(hashedPassword);
            userDoc.password = hashedPassword;
            userDoc.resetToken = '';
            userDoc.resetTokenExpiration = '';
            userDoc.save();
            return res.status(201).json({
                message: 'Password changed!'
            })
        })
        .catch(err => next(err))
}

exports.showUserStatus = async (req, res, next) => {
    try{
        const userName = req.params.userName;
        const user = await User.find({userName: userName});
        if(!user){
            const error = new Error('このユーザーはいないかも')
            error.status = 500;
            throw error;
        }
        res.status(201).json({
            message: 'show user status',
            user: user
        })
    } catch(err){
        next(err);
    }
}

exports.updateUserStatus = async (req, res, next) => {
    try{
        const userId = req.body._id;
        const userName = req.body.userName;
        const email = req.body.email;
        const thumb = req.file;
        const password = req.body.password;
        const passwordConfirm = req.body.passwordConfirm;
        const fruit = req.body.fruit;

        const hashedPassword = await bcrypt.hash(password, 12);
        
        // const isUserNameExists = await User.findOne({userName: newUser.userName});
        // if(oldUser._id !== newUser._id){
        //     const error = new Error('このユーザの情報を更新する権限がありません')
        //     error.status = 403;
        //     throw error;
        // }else if(
        //     oldUser.userName===newUser.userName && 
        //     oldUser.email===newUser.email && 
        //     oldUser.thumb===newUser.thumb && 
        //     oldUser.password===newUser.password && 
        //     oldUser.fruit===newUser.fruit ){
        //     const error = new Error('更新箇所が見つかりません')
        //     error.status = 404;
        //     throw error;
        // }else if(oldUser.userName !== newUser.userName && isUserNameExists){
        //     const error = new Error('すでにそのユーザ名は使われています')
        //     error.status = 422;
        //     throw error;
        // }
        console.log(thumb);

        if(!thumb){
            const error = new Error('画像がありません')
            error.status = 422;
            throw error;
        }
        
        const userDoc = await User.findById(userId);
        if(!userDoc){
            const error = new Error('ユーザーがいません')
            error.status = 404;
            throw error;
        }

        const newUser = {
            _id: userId,
            userName: userName,
            email: email,
            thumb: thumb.path,
            password: hashedPassword,
            fruit: fruit
        }
        
        userDoc.overwrite(newUser);
        const newUserDoc = await userDoc.save();
        if(!newUserDoc){
            const error = new Error('ユーザー情報を書き換えできなかったかも')
            error.status = 500;
            throw error;
        }
        console.log('ユーザ情報更新完了')
        res.status(201).json({
            message: 'update succeeded!',
            user: newUserDoc
        })
    } catch(err){
        next(err);
    }
}