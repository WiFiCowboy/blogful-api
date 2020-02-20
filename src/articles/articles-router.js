const path = require('path')
const express = require('express')
const xss = require('xss')
const ArticlesService = require('./articles-service')

const articlesRouter = express.Router()
const jsonParser = express.json()

articlesRouter
  .route('/')
  .get((req, res, next) => {
    ArticlesService.getAllArticles(
      req.app.get('db')
    )
      .then(articles => {
        res.json(articles)
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { title, content, style } = req.body
    const newArticle = { title, content, style }

    for (const [key, value] of Object.entries(newArticle)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
      }
    }

    ArticlesService.insertArticle(
      req.app.get('db'),
      newArticle
    )
      .then(articles => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl + `/${articles.id}`))
          .json(articles)
      })
      .catch(next)
  })

articlesRouter
  .route('/:article_id')
  .all((req, res, next) => {
    ArticlesService.getById(
      req.app.get('db'),
      req.params.article_id
    )
      .then(article => {
        if (!article) {
          return res.status(404).json({
            error: { message: `Article doesn't exist` }
          })
        }
        res.article = article // save the article for the next middleware
        next() // don't forget to call next so the next middleware happens!
      })
      .catch(next)
  })
  .get((req, res, next) => {
    const article = res.article
    res.json({
      id: article.id,
      style: article.style,
      title: xss(article.title), // sanitize title
      content: xss(article.content), // sanitize content
      date_published: article.date_published,
    })

  })
  .delete((req, res, next) => {
    res.status(204).end()
    ArticlesService.deleteArticle(
      req.app.get('db'),
      req.params.article_id
    )
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
    const { title, content, style } = req.body
    const articlesToUpdate = { title, content, style }

    const numberOfValues = Object.values(articlesToUpdate).filter(Boolean).length
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'style' or 'content'`
        }
      })
    }

    ArticlesService.updateArticle(
      req.app.get('db'),
      req.params.article_id,
      articlesToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = articlesRouter