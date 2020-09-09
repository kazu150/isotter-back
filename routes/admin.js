const express = require('express');
const { body } = require('express-validator/check')
const bcrypt = require('bcryptjs');

const User = require('../models/user');
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth'); 

const router = express.Router();

router.put(
    '/signup',
    [
        body('userName')
            .trim()
            .isLength({min: 5})
            .withMessage('条件に合うuserNameを登録してください')
            .custom((value, {req}) => {
                return User.findOne({userName: value}).then(userDoc => {
                    if(userDoc){
                        return Promise.reject('このuserNameはすでに使われています')
                    }
                })
            }),
        body('email')
            .trim()
            .isLength({min: 5})
            .isEmail()
            .withMessage('条件に合うemailを登録してください')
            .custom((value, {req}) => {
                return User.findOne({email: value}).then(userDoc => {
                    if(userDoc){
                        return Promise.reject('このemailはすでに使われています')
                    }
                })
            }),
        body('password', 'パスワードは6文字以上の英数字を入力')
            .isLength({min: 6})
            .isAlphanumeric(),
        body('confirmPassword')
            .custom((value, { req }) => {
                if(value !== req.body.password){
                    throw new Error('パスワードが間違っています')
                }
                return true;
            })
    ],
    adminController.signup );
router.post(
    '/login',
    [
        body('userName')
            .custom((value, {req}) => {
                return User.findOne({userName: value}).then(userDoc => {
                    req.user = userDoc;
                    if(!userDoc){
                        return Promise.reject('ユーザーがいないみたい。')
                    }
                })
            }),
        body('password')
            .custom((value, {req}) => {
                return bcrypt.compare(value, req.user.password).then(pwCompare => {
                    if(!pwCompare){
                        return Promise.reject('パスワードが一致しません')
                    }
                })
            })
    ],
    adminController.login );
router.post(
    '/reset-password', 
    [
        body('email')
            .isEmail()
            .withMessage('条件に合うemailを登録してください')
            .custom((value, {req}) => {
                return User.findOne({email: value}).then(userDoc => {
                    req.user = userDoc;
                    if(!userDoc){
                        return Promise.reject('メールアドレスが登録されていません')
                    }
                })
            }),

    ],
    adminController.forgotPassword);
router.get('/reset-password/:token', adminController.confirmResetToken);
router.patch(
    '/reset-password/:token',
    [
        body('password', 'パスワードは6文字以上の英数字を入力')
            .isLength({min: 6})
            .isAlphanumeric(),
    ],
    adminController.resetPassword);
router.get('/userStatus/:userName', adminController.showUserStatus );
router.patch(
    '/userStatus',
    isAuth, 
    [
        body('_id')
            .custom((value, {req}) => {
                if( req.userId === value ){
                    const error = new Error('このユーザの情報を更新する権限がありません')
                    error.status = 403;
                    throw error;
                }
                return true;
            }),
        body('userName')
            .trim()
            .isLength({min: 5})
            .withMessage('条件に合うuserNameを登録してください')
            .custom((value, {req}) => {
                return User.findOne({userName: value}).then(userDoc => {
                    if(userDoc && userDoc._id !== req.userId){
                        return Promise.reject('このuserNameはすでに使われています')
                    }
                })
            }),
        body('email')
            .trim()
            .isLength({min: 5})
            .isEmail()
            .withMessage('条件に合うemailを登録してください')
            .custom((value, {req}) => {
                return User.findOne({email: value}).then(userDoc => {
                    if(userDoc && userDoc._id !== req.userId){
                        return Promise.reject('このemailはすでに使われています')
                    }
                })
            }),
        body('password', 'パスワードは6文字以上の英数字を入力')
            .isLength(0, {min: 6})
            .isAlphanumeric(),
        body('confirmPassword')
            .custom((value, { req }) => {
                if(value !== req.body.password){
                    throw new Error('パスワードが間違っています')
                }
                return true
            }),
    ],
    adminController.updateUserStatus );

module.exports = router;
