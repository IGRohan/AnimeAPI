import axios from 'axios';
import { load } from 'cheerio';
import parser from 'xml2json';

const gogoBase = "https://gogoanime.lu/";
const animixBase = "https://animixplay.to/"
const animixSearchApi = "https://cachecow.eu/api/search";
const animixAll = "https://animixplay.to/assets/s/all.json";
const gogoBase2 = "https://gogoanime.gg/";
const gogoBase3 = "https://ww3.gogoanime2.org/home"
const gogoajax = "https://ajax.gogo-load.com/";
const episodeListPage = "https://ajax.gogo-load.com/ajax/load-list-episode";
const goloadStreaming = "https://goload.pro/streaming.php"

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36";
const headerOption = { headers: { "User-Agent": USER_AGENT } };

const GENRES = [
    'Action', 'Adventure', 'Anti-Hero', 'CGDCT', 'College', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Gag Humor',
    'Game', 'Harem', 'Historical', 'Horror', 'Idol', 'Isekai', 'Iyashikei', 'Josei', 'Kids', 'Magical Girl',
    'Martial Arts', 'Mecha', 'Military', 'Movie', 'Music', 'Mythology', 'Mystery', 'Otaku', 'Parody', 'Police',
    'Psychological', 'Racing', 'Revenge', 'Romance', 'Rural', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo',
    'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural',
    'Survival', 'Suspense', 'Time Travel', 'Vampire', 'Work'
]

// Importing helper functions
import {
    encodeString,
    decodeStreamingLinkAnimix,
    firstLetterToUpperCase
} from '../helper/utils.js';

// Importing Gogoanime functions
import {
    decryptAjaxResponse,
    getAjaxParams
} from '../helper/gogoanime.js';

export const fetchSearchGogo = async ({ list = [], keyw, page = 1 }) => {
    try {
        if (!keyw) return {
            error: true,
            error_message: "No keyword provided"
        }
        const fetchSearchPage = await axios.get(gogoBase + `/search.html?keyword=${keyw}&page=${page}`)
        const $ = load(fetchSearchPage.data)

        $('div.last_episodes > ul > li').each((index, element) => {
            list.push({
                animeId: $(element).find('p.name > a').attr('href').split('/')[2],
                animeTitle: $(element).find('p.name > a').attr('title'),
                animeUrl: gogoBase + "/" + $(element).find('p.name > a').attr('href'),
                animeImg: $(element).find('div > a > img').attr('src'),
                status: $(element).find('p.released').text().trim()
            });
        });

        return list;
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchSearchAnimix = async ({ list = [], keyw }) => {
    try {
        if (!keyw) return {
            error: true,
            error_message: "No keyword provided"
        }
        const fetchAnimix = await axios.request({
            url: animixSearchApi,
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": USER_AGENT
            },
            data: new URLSearchParams({ qfast: keyw })
        });

        const $ = load(fetchAnimix.data.result);
        $('a').each((index, element) => {
            list.push({
                animeTitle: $(element).attr('title'),
                animeId: $(element).attr('href').split("/v1/")[1],
                animeImg: $(element).find('div.searchimg > img').attr('src')

            })
        });

        return list;
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchGogoRecentEpisodes = async ({ list = [], page = 1, type = 1 }) => {
    try {
        const res = await axios.get(gogoajax + `ajax/page-recent-release.html?page=${page}&type=${type}`)
        const $ = load(res.data)

        $('div.last_episodes.loaddub > ul > li').each((i, el) => {
            list.push({
                episodeId: $(el).find('p.name > a').attr('href').split('/')[1],
                animeTitle: $(el).find('p.name > a').attr('title'),
                episodeNum: $(el).find('p.episode').text().replace('Episode ', '').trim(),
                subOrDub: $(el).find('div > a > div').attr('class').replace('type ic-', ''),
                animeImg: $(el).find('div > a > img').attr('src'),
                episodeUrl: gogoBase + "/" + $(el).find('p.name > a').attr('href')
            })
        })

        return list;
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchAnimixRecentEpisodes = async ({ list = [] }) => {
    try {
        const res = await axios.get(animixBase + 'rsssub.xml');
        const jsonResults = JSON.parse(parser.toJson(res.data)).rss.channel.item;

        jsonResults.map((anime) => {
            const $ = load(anime.description);
            list.push({
                episodeTitle: anime.title.split(" ").slice(0, -2).join(" "),
                animeId: anime.link.split("/")[4],
                releaseTimeUnix: Date.parse(anime.pubDate) / 1000,
                mal_id: anime.idmal,
                episodeNum: anime.ep.split("/")[0],
                episodes: anime.ep,
                animeImg: $("img").attr("src")
            })
        });

        return list;
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        };
    }
};

export const fetchPopular = async ({ list = [], type = 1 }) => {
    try {
        if (type == 1) {
            const res = await axios.get(animixBase + 'assets/popular/popular.json', headerOption);

            res.data.result.map((anime) => {
                list.push({
                    animeTitle: anime.title,
                    mal_id: anime.url.split("/").reverse()[0],
                    animeImg: anime.picture,
                    views: anime.infotext.split(" ")[3],
                    score: anime.score / 100
                })
            })
        } else if (type == 2) {
            const res = await axios(animixBase + 'api/search', {
                method: "POST",
                headers: {
                    "User-Agent": USER_AGENT,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: new URLSearchParams({ genre: "any", minstr: 99999999, orderby: "popular" })
            })

            res.data.result.map((anime) => {
                list.push({
                    animeTitle: anime.title,
                    animeId: anime.url.split("/").reverse()[0],
                    animeImg: anime.picture,
                    format: anime.infotext,
                    score: anime.score / 100
                })
            })
        }

        return list;
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchAnimixAllAnime = async ({ list = [] }) => {
    try {
        const fetchAnimixAll = await axios.get(animixAll, headerOption);
        fetchAnimixAll.data.map(anime => {
            list.push({
                animeTitle: anime.title,
                animeId: anime.id
            })
        });

        return list;
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
}

export const fetchAnimeByGenre = async ({ list = [], genre }) => {
    try {
        if (!genre) {
            return {
                error: true,
                error_message: "No genre provided"
            }
        };

        if (genre.toLowerCase() === "anti-hero") {
            genre = "Anti-Hero"
        } else if (genre.toLowerCase() === "cgdct") {
            genre = "CGDCT"
        } else {
            genre = firstLetterToUpperCase(genre);
        }

        if (!GENRES.includes(genre)) {
            return {
                error: true,
                error_message: "This genre does not exist."
            }
        };

        const res = await axios.request({
            url: animixBase + "api/search",
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": USER_AGENT
            },
            data: new URLSearchParams({ genre, minstr: 99999999, orderby: "popular" })
        });

        res.data.result.map((anime) => {
            list.push({
                animeTitle: anime.title,
                animeId: anime.url.split("/v1/")[1],
                animeImg: anime.picture,
                animeSeason: anime.infotext,
                score: anime.score / 100
            })
        });

        return list;

    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchGogoAnimeInfo = async ({ animeId, list = {} }) => {
    try {
        let genres = [];
        let episodes = [];

        const res = await axios.get(gogoBase + `category/${animeId}`);
        const $ = load(res.data);

        const animeTitle = $('div.anime_info_body_bg > h1').text();
        const animeImg = $('div.anime_info_body_bg > img').attr('src');
        const type = $('div.anime_info_body_bg > p:nth-child(4) > a').text();
        const synopsis = $('div.anime_info_body_bg > p:nth-child(5)').text().replace('Plot Summary: ', '');
        const releaseDate = $('div.anime_info_body_bg > p:nth-child(7)').text().replace('Released: ', '');
        const status = $('div.anime_info_body_bg > p:nth-child(8) > a').text();
        const otherNames = $('div.anime_info_body_bg > p:nth-child(9)').text().replace('Other name: ', '').replace(/;/g, ',');

        $('div.anime_info_body_bg > p:nth-child(6) > a').each((index, element) => {
            genres.push($(element).attr('title').trim());
        });

        const epStart = $("#episode_page > li").first().find('a').attr('ep_start');
        const epEnd = $('#episode_page > li').last().find('a').attr('ep_end');
        const movieId = $('#movie_id').attr('value');
        const alias = $('#alias_anime').attr('value');

        const episodesPage = await axios.get(`${episodeListPage}?ep_start=${epStart}&ep_end=${epEnd}&id=${movieId}&default_ep=${0}&alias=${alias}`);
        const $$ = load(episodesPage.data);

        $$("#episode_related > li").each((i, el) => {
            episodes.push({
                episodeId: $(el).find("a").attr("href").split('/')[1],
                epNum: $(el).find(`div.name`).text().replace('EP ', ''),
                episodeUrl: gogoBase + $(el).find(`a`).attr('href').trim()
            });
        });

        list = {
            animeTitle: animeTitle.toString(),
            type: type.toString(),
            synopsis: synopsis.toString(),
            animeImg: animeImg.toString(),
            releaseDate: releaseDate.toString(),
            status: status.toString(),
            genres,
            otherNames,
            eptotal: epEnd,
            episodes
        };

        return list;

    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchAnimixAnimeInfo = async ({ malId, list = {} }) => {
    try {
        if (!malId) return {
            error: "No ID provided"
        };
        const fetchInfo = await axios.get(animixBase + `assets/mal/${malId}.json`, headerOption);
        const fetchInfoLinks = await axios.get(animixBase + `assets/rec/${malId}.json`, headerOption)

        list = {
            animeTitle: fetchInfo.data.title,
            animeId: fetchInfoLinks.data["Gogoanime"][0].url.split('/').reverse()[0],
            mal_id: fetchInfo.data.mal_id,
            animeImg: fetchInfo.data.image_url,
            episodes: fetchInfo.data.episodes,
            status: fetchInfo.data.status,
            score: fetchInfo.data.score,
            synopsis: fetchInfo.data.synopsis,
            genres: fetchInfo.data.genres.map((genr) => genr.name),
            studios: fetchInfo.data.studios.map((st) => st.name),
            gogoAnimeLink: fetchInfoLinks.data["Gogoanime"],
            animepaheLink: fetchInfoLinks.data["animepahe"],
            zoroLink: fetchInfoLinks.data["Zoro"]
        }

        return list;
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchAnimixEpisodeInfo = async ({ animeId, list = {} }) => {
    try {
        if (!animeId) {
            return {
                error: "No anime ID provided"
            }
        }

        const res = await axios.get(animixBase + `v1/${animeId}`, headerOption);
        let episodes = [];
        const $ = load(res.data);

        const epList = JSON.parse($("#epslistplace").text());

        for (var key in epList) {
            if (Number(key) + 1) {
                episodes.push({
                    epNum: Number(key) + 1,
                    link: epList[key]
                })
            };
        };

        list = {
            animeTitle: $('span.animetitle').text(),
            mal_id: ($('body > script').get()[0].children[0].data).match(/var malid = '(.*)';/)[1],
            genres: $('span#genredata').text(),
            status: $('span#status').text(),
            total_episodes: epList.eptotal,
            extraLinks: epList?.extra,
            episodes
        }

        return list;
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchAnimixEpisodeSource = async ({ episodeId }) => {
    try {
        let sources = [];
        let type;
        let episodeGogoLink;

        if (!episodeId) return {
            error: "No episode ID provided"
        }
        const animeId = episodeId.split("-").reverse().splice(2).reverse().join("-")
        const episodeNum = episodeId.split("-").splice(-1).join("");

        const res = await axios.get(animixBase + `v1/${animeId}`, headerOption);
        const $ = load(res.data)
        const epList = JSON.parse($("#epslistplace").text());

        if (episodeNum in epList.extra) {
            episodeGogoLink = new URL("https:" + epList.extra[episodeNum]);
        } else {
            episodeGogoLink = new URL("https:" + epList[episodeNum - 1]);
        };


        let liveApiLink;

        //Checking if the episode source link is already a Plyr link or not
        if (episodeGogoLink.href.includes("player.html")) {
            liveApiLink = episodeGogoLink.href;
        } else {
            const content_id = episodeGogoLink.searchParams.get("id");
            liveApiLink = "https://animixplay.to/api/live" + encodeString(`${content_id}LTXs3GrU8we9O${encodeString(content_id)}`);
        };

        const src = await decodeStreamingLinkAnimix(liveApiLink);

        if (src.includes("player.html")) {
            type = "plyr"
        } else if (src.includes(".m3u8")) {
            type = "hls"
        } else if (src.includes(".mp4")) {
            type = "mp4"
        };
        sources.push({
            file: src,
            type
        })

        return {
            animeId,
            episodeNum,
            sources: sources
        }
    } catch (err) {
        console.log(err)
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchGogoanimeEpisodeSource = async ({ episodeId }) => {
    try {
        let sources = [];
        let sources_bk = [];

        let gogoWatchLink;
        if (episodeId.includes('episode')) {
            const res = await axios.get(gogoBase2 + episodeId);
            const $ = load(res.data);

            const gogoWatch = $('#load_anime > div > div > iframe').attr('src');
            gogoWatchLink = new URL("https:" + gogoWatch);
        } else gogoWatchLink = new URL(`${goloadStreaming}?id=${episodeId}`);

        const gogoServerRes = await axios.get(gogoWatchLink.href, headerOption);
        const $$ = load(gogoServerRes.data);

        const params = await getAjaxParams($$, gogoWatchLink.searchParams.get('id'));

        const fetchRes = await axios.get(`${gogoWatchLink.protocol}//${gogoWatchLink.hostname}/encrypt-ajax.php?${params}`, {
            headers: {
                "User-Agent": USER_AGENT,
                "X-Requested-With": "XMLHttpRequest"
            }
        });

        const finalSource = await decryptAjaxResponse(fetchRes.data);
        if (!finalSource.source) return { error: "No sources found" };

        finalSource.source.map(src => sources.push(src));
        finalSource.source_bk.map(src => sources_bk.push(src));

        return {
            Referer: gogoWatchLink.href,
            sources: sources,
            sources_bk: sources_bk
        }
    } catch (err) {
        console.log(err);
        return {
            error: true,
            error_message: err
        }
    }
};

export const fetchGogoDayTopAnimes = async ({ list = [] }) => {
    try {
        const res = await axios.get(gogoBase3);
        const $ = load(res.data);
        $("div#load_topivews > ul > li").each((li, el) => {
          list.push({
            animeTitle: $(el).find("a  ").attr("title"),
            animeEp: $(el).find("p.reaslead  ").text(),
            watchLink : "https://ww3.gogoanime2.org"+$(el).find("a").attr("href")
          });
        });
        return list;
      } catch (error) {
        console.log(error);
      }
}