const express = require('express');
const { body } = require('express-validator/check')

const timelineController = require('../controllers/timeline');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/posts', timelineController.getPosts);
router.post(
    '/post', 
    [
        body('content', '投稿可能文字数は1~140文字です')
            .isLength({ min: 1, max: 140 })
    ],
    isAuth, 
    timelineController.createPost);
router.delete('/post', isAuth, timelineController.deletePost);

module.exports = router;