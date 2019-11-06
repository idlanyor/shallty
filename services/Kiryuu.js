const Util = require('../utils/utils')
const { kiryuu_url } = require('../config.json')

class Kiryuu {
    constructor() {
        this.browser = null
    }
    
    /**
     * Get manga list from manga list page.
     *
     */
    async getMangaList() {
        if (!this.browser)
            return {
                error: true,
                message: 'Browser not ready.'
            }

        const page = await this.browser.newPage()

        try {
            await page.goto(kiryuu_url + '/manga/?list', {
                timeout: 300000
            })

            await page.waitForSelector('div.soralist')
            const mangaList = []
            const soraList = await page.$('div.soralist')
            const anchors = await soraList.$$('a.series')
            await Util.asyncForEach(anchors, async (anchor) => {
                const title = await anchor.getProperty('innerHTML').then(x => x.jsonValue())
                const link = await anchor.getProperty('href').then(x => x.jsonValue())

                mangaList.push({
                    title: title,
                    link: link
                })
            })

            await page.close()

            return mangaList
        } catch (error) {
            console.error(error)
            await page.close()

            return {
                error: true,
                message: 'Something went wrong. ' + error
            }
        }
    }

    /**
     * Get manga info from manga page.
     * 
     * @param {String} link Manga page url.
     */
    async getMangaInfo(link) {
        const page = await this.browser.newPage()

        try {
            link = decodeURIComponent(kiryuu_url + link)
            await page.goto(link, {
                timeout: 300000
            })

            await page.waitForSelector('div.infox')
            let alternate_title, synopsis, author, type, genres, status, released
            const infox = await page.$('div.infox')
            const title = await infox.$eval('h1', h1 => {
                return h1.innerText.replace(/ Bahasa Indonesia| Bahasa| Indonesia|/gi, '')
            })
            const cover = await page.$eval('div.thumb > img', img => img.src)
            if (await infox.$('span.alter') !== null) {
                alternate_title = await infox.$eval('span.alter', span => {
                    return span.innerText
                })
            }
            if (await infox.$('div.desc') !== null) {
                synopsis = await infox.$eval('div.desc', desc => {
                    return desc.innerText
                })
            }
            if (await infox.$('div.spe') !== null) {
                const raw = await infox.$eval('div.spe', desc => {
                    return desc.innerText
                })
                const arrRaw = raw.split('\n')
                await Util.asyncForEach(arrRaw, (item) => {
                    const lower = item.toLowerCase()

                    if (lower.length > 0) {
                        if (lower.includes('author')) {
                            const parsed = item.replace(/author: |author : |author :|author:|author\(s\):: /gi, '')
                            author = parsed
                        } else if (lower.includes('type')) {
                            const parsed = lower.replace(/type: |type : |type :|type:|type:: /gi, '')
                            type = parsed
                        } else if (lower.includes('genre')) {
                            const parsed = item.replace(/genres: |genres : |genres :|genres:|genres:: |genre: |genre : |genre :|genre:|genre:: /gi, '')
                            genres = parsed.split(', ')
                        } else if (lower.includes('status')) {
                            const parsed = lower.replace(/status: |status : |status :|status:|status:: /gi, '')
                            status = parsed
                        } else if (lower.includes('released')) {
                            const parsed = lower.replace(/released: |released : |released :|released:|released:: /gi, '')
                            released = parsed
                        }
                    }
                })
            }

            await page.close()

            return {
                title: title,
                cover: cover,
                alternate_title: alternate_title, 
                synopsis: synopsis, 
                author: author, 
                type: type, 
                genres: genres, 
                status: status, 
                released: released
            }
        } catch (error) {
            console.error(error)
            await page.close()

            return {
                error: true,
                message: 'Something went wrong. ' + error
            }
        }
    }

    /**
     * Get chapter list from manga page.
     * 
     * @param {String} link Manga page url.
     */
    async getChapters(link) {
        if (!this.browser)
            return {
                error: true,
                message: 'Browser not ready.'
            }

        const page = await this.browser.newPage()

        try {
            link = decodeURIComponent(kiryuu_url + link)
            await page.goto(link, {
                timeout: 300000
            })

            await page.waitForSelector('div.bixbox.bxcl')
            const chapters = []
            const bixbox = await page.$('div.bixbox.bxcl')
            const anchors = await bixbox.$$('span.lchx > a')
            await Util.asyncForEach(anchors, async (anchor) => {
                const chapter = await anchor.getProperty('innerText').then(x => x.jsonValue())
                const link = await anchor.getProperty('href').then(x => x.jsonValue())

                if (chapter && chapter !== '') {
                    chapters.push({
                        chapter: chapter,
                        link: link
                    })
                }
            })

            await page.close()

            return chapters
        } catch (error) {
            console.error(error)
            await page.close()

            return {
                error: true,
                message: 'Something went wrong. ' + error
            }
        }
    }

    /**
     * Get images from chapter page.
     * 
     * @param {String} link Chapter page url.
     */
    async getImages(link) {
        if (!this.browser)
            return {
                error: true,
                message: 'Browser not ready.'
            }

        const page = await this.browser.newPage()

        try {
            link = decodeURIComponent(kiryuu_url + link)
            await page.goto(link, {
                timeout: 300000
            })

            await page.waitForSelector('div#readerarea')

            const images = []
            const chapter = await page.$eval('div.headpost > h1', h1 => {
                return h1.innerText
            })
            const readerarea = await page.$('div#readerarea')
            const imgs = await readerarea.$$('img.aligncenter')
            await Util.asyncForEach(imgs, async (img) => {
                const src = await img.getProperty('src').then(x => x.jsonValue())

                images.push({
                    link: src
                })
            })

            await page.close()

            return {
                chapter: chapter,
                images: images
            }
        } catch (error) {
            console.error(error)
            await page.close()

            return {
                error: true,
                message: 'Something went wrong. ' + error
            }
        }
    }

    /**
     * Get new releases from home page.
     *
     */
    async getNewReleases() {
        const page = await this.browser.newPage()

        try {
            await page.goto(kiryuu_url, {
                timeout: 300000
            })

            await page.waitForSelector('div.listupd')
            const releases = []
            let listupd = await page.$$('div.listupd')
            listupd = listupd[listupd.length - 1]
            const utaos = await listupd.$$('div.utao')
            await Util.asyncForEach(utaos, async (utao) => {
                const { title, titleLink } = await utao.$eval('div.uta > div.luf > a.series', a => {
                    return {
                        title: a.title,
                        titleLink: a.href
                    }
                })

                const { chapter, chapterLink } = await utao.$eval('div.uta > div.luf > ul > li > a', (a) => {
                    return {
                        chapter: a.innerText,
                        chapterLink: a.href
                    }
                })

                releases.push({
                    title: title,
                    title_url: titleLink,
                    chapter: chapter,
                    chapter_url: chapterLink
                })
            })

            await page.close()

            return releases
        } catch (error) {
            console.error(error)
            await page.close()

            return false
        }
    }
}

module.exports = Kiryuu