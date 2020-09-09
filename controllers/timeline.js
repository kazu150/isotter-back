const { validationResult } = require('express-validator/check')
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
    const posts = await Post.find().populate('userId');
    try {
        if(!posts.length){
            throw Error('Posts取得失敗')
        }
        res.status(200).json({
            posts: posts
        });
    } catch(err) {
        if(!err.status){
            err.status = 500;
        }
        next(err);
    }
}

exports.createPost = async (req, res, next) => {
    try {
        const user = req.body.userId;
        const content = req.body.content;
        const errs = validationResult(req);

        if(!errs.isEmpty()){
            const errorMessage = errs.errors[0].msg;
            const error = new Error(errorMessage)
            error.status = 422;
            throw error;
        }

        const userId = await User.findById(req.body.userId);
        const post = new Post({
            userId: user,
            content: content
        });
        const savedPost = await post.save()

        if(!savedPost._doc){
            const error = new Error('Post投稿失敗')
            error.status = 500;
            throw error;
        }
        res.status(201).json({
            message: 'Post created successfully!',
            post: {...savedPost._doc, userId}
        })

    } catch(err) {
        next(err)
    }
}

exports.deletePost = (req, res, next) => {
    const postId = req.body.postId;
    Post.findById(postId)
        .then(post => {
            if(!post){
                const error = new Error('Postが見つかりません');
                error.status = 404;
                throw error;
            }
            if(post.userId.toString() !== req.userId){
                const error = new Error('このPostを削除する権限がありません');
                error.status = 403;
                throw error;
            }
            return Post.findByIdAndRemove(postId)
        })
        .then(result => {
            res.status(201).json({
                message: 'post deleted successfully!',
                deletedPost: result
            })
        })
        .catch(err => {
            if(!err.status){
                err.status = 500;
            }
            next(err);
        })
}