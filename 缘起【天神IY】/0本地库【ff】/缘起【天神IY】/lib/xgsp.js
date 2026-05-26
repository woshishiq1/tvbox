import { Crypto, load, _ } from 'assets://js/lib/cat.js';

let siteUrl = 'https://www.danmuku.cc';
let siteKey = '';
let siteType = 0;
let headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
};

async function request(reqUrl, postData = null, get = true) {
    let res = await req(reqUrl, {
        method: get ? 'get' : 'post',
        headers: headers,
        data: postData || {},
        postType: get ? '' : 'form',
    });
    return res.content;
}

async function init(cfg) {
    siteKey = cfg.skey;
    siteType = cfg.stype;
}

async function home(filter) {
    let classes = [
        { type_id: '20', type_name: '电影' },
        { type_id: '37', type_name: '连续剧' },
        { type_id: '43', type_name: '动漫' },
        { type_id: '45', type_name: '综艺' },
        { type_id: '47', type_name: 'B站' },
        { type_id: '60', type_name: '人人专区' }
    ];

    let filterObj = genFilterObj();
    return JSON.stringify({
        class: classes,
        filters: filterObj
    });
}

async function homeVod() {
    let videos = await getVideos(siteUrl);
    return JSON.stringify({
        list: videos,
    });
}

async function category(tid, pg, filter, extend) {
    let id = extend['id'] || tid; 
    let page = pg || 1;
    let url = `${siteUrl}/index.php/vod/show/id/${id}/page/${page}.html`;

    let videos = await getVideos(url);
    return JSON.stringify({
        list: videos,
    });
}

async function detail(id) {
    try {
        let url = siteUrl + id;
        const html = await request(url);
        const $ = load(html);
        
        let title = $('h1.title').text().trim();
        let pic = $('.stui-content__thumb .lazyload').attr('data-original');
        let content = $('.detail-content').text().trim() || $('.detail-sketch').text().trim();
        
        let director = '';
        let actor = '';
        
        $('p.data').each((i, el) => {
            let text = $(el).text();
            if (text.includes('导演：')) {
                director = $(el).find('a').map((i, a) => $(a).text()).get().join(' ');
            } else if (text.includes('主演：')) {
                actor = $(el).find('a').map((i, a) => $(a).text()).get().join(' ');
            }
        });

        // Parse play sources (e.g. TX, QY)
        let playFroms = [];
        $('.nav-tabs.dpplay li a').each((i, el) => {
            playFroms.push($(el).text().trim());
        });
        
        // Parse play URLs for each source
        let playUrls = [];
        $('.stui-content__playlist').each((i, el) => {
            let urls = [];
            $(el).find('li a').each((j, a) => {
                let epTitle = $(a).text().trim();
                let link = $(a).attr('href');
                urls.push(`${epTitle}$${link}`);
            });
            playUrls.push(urls.join('#'));
        });

        const video = {
            vod_id: id,
            vod_name: title,
            vod_pic: pic,
            vod_actor: actor,
            vod_director: director,
            vod_content: content,
            vod_play_from: playFroms.join('$$$'),
            vod_play_url: playUrls.join('$$$'),
        };
        
        return JSON.stringify({ list: [video] });
    } catch (e) {
       // Error block
    }
    return null;
}

async function search(wd, quick, pg) {
    let page = pg || 1;
    let url = `${siteUrl}/index.php/vod/search/page/${page}/wd/${encodeURIComponent(wd)}.html`;
    
    let videos = await getVideos(url);
    return JSON.stringify({
        list: videos,
    });
}

async function play(flag, id, flags) {
    let url = siteUrl + id;
    const html = await request(url);
    const $ = load(html);
    
    let info = '';
    for(const n of $('script')) {
        let text = $(n).text();
        if(text.includes('player_aaaa=')) {
            info = text.split('player_aaaa=')[1];
            break;
        }
    }
    
    let obj = JSON.parse(info);
    let playUrl = obj.url;
    
    if(obj.encrypt == 1) {
        playUrl = unescape(playUrl);
    } else if (obj.encrypt == 2) {
        playUrl = unescape(base64Decode(playUrl));
    }

    try {
        // Xigua DH API Resolution
        let xiguaUrl = `https://hls.xiguadh.com?url=${playUrl}`;
        let xiguaHtml = await request(xiguaUrl);
        
        let tokenMatch = xiguaHtml.match(/apiToken:\s*"([^"]+)"/);
        if (tokenMatch && tokenMatch[1]) {
            let apiToken = tokenMatch[1];
            let resolveUrl = `https://hls.xiguadh.com/api/resolve.php?token=${encodeURIComponent(apiToken)}`;
            
            let resolveRes = await request(resolveUrl); 
            let resolveObj = JSON.parse(resolveRes);
            
            if (resolveObj.code === 200 && resolveObj.url) {
                return JSON.stringify({
                    parse: 0,
                    url: resolveObj.url,
                });
            }
        }
    } catch (e) {
        // Fallback gracefully to returning the unparsed url if the resolving fails
    }

    return JSON.stringify({
        parse: 0,
        url: playUrl,
    });
}

function genFilterObj() {
    return {
        '20': [{'key': 'id', 'name': '类型', 'value': [{'n': '全部', 'v': '20'}, {'n': '动作片', 'v': '21'}, {'n': '喜剧片', 'v': '22'}, {'n': '爱情片', 'v': '23'}, {'n': '科幻片', 'v': '24'}, {'n': '恐怖片', 'v': '25'}, {'n': '剧情片', 'v': '26'}, {'n': '战争片', 'v': '27'}, {'n': '惊悚片', 'v': '28'}, {'n': '犯罪片', 'v': '29'}, {'n': '冒险篇', 'v': '30'}, {'n': '动画片', 'v': '31'}, {'n': '悬疑片', 'v': '32'}, {'n': '武侠片', 'v': '33'}, {'n': '奇幻片', 'v': '34'}, {'n': '纪录片', 'v': '35'}, {'n': '其他片', 'v': '36'}]}],
        '37': [{'key': 'id', 'name': '类型', 'value': [{'n': '全部', 'v': '37'}, {'n': '国产剧', 'v': '38'}, {'n': '港台剧', 'v': '39'}, {'n': '欧美剧', 'v': '40'}, {'n': '日韩剧', 'v': '41'}, {'n': '其他剧', 'v': '42'}]}],
        '43': [{'key': 'id', 'name': '类型', 'value': [{'n': '全部', 'v': '43'}, {'n': '动漫', 'v': '44'}]}],
        '45': [{'key': 'id', 'name': '类型', 'value': [{'n': '全部', 'v': '45'}, {'n': '综艺', 'v': '46'}]}],
        '47': [{'key': 'id', 'name': '类型', 'value': [{'n': '全部', 'v': '47'}, {'n': '番剧（B站）', 'v': '48'}, {'n': '国创（B站）', 'v': '49'}, {'n': '电影（B站）', 'v': '50'}, {'n': '电视剧（B站）', 'v': '51'}]}],
        '60': [{'key': 'id', 'name': '类型', 'value': [{'n': '全部', 'v': '60'}, {'n': '连续剧', 'v': '61'}, {'n': '电影', 'v': '62'}, {'n': '动漫', 'v': '63'}, {'n': '综艺', 'v': '64'}, {'n': '纪录片', 'v': '66'}]}]
    };
}

async function getVideos(url) {
    const html = await request(url);
    const $ = load(html);
    const cards = $('div.stui-vodlist__box > a.stui-vodlist__thumb');
    
    let videos = _.map(cards, (n) => {
        let id = n.attribs['href'];
        let name = n.attribs['title'];
        let pic = n.attribs['data-original'];
        let remark = $($(n).find('span.pic-text')[0]).text().trim();
        
        return {
            vod_id: id,
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remark,
        };
    });
    return videos;
}

function base64Encode(text) {
    return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(text));
}

function base64Decode(text) {
    return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(text));
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search,
    };
}