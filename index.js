import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import dotenv from 'dotenv';
import favicon from 'serve-favicon';
import yts from 'yt-search';
import * as play from 'play-dl';
import cors from 'cors';
import axios from "axios";
import { Innertube, UniversalCache, Utils } from 'youtubei.js';
import ytdl from '@distube/ytdl-core';
import fetch from "node-fetch";
import vm from "vm";
import qs from "querystring";
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipe = promisify(pipeline);

// youtube-decipher.js
const DECIPHER_FUNC_NAME = "DisTubeDecipherFunc";
const N_TRANSFORM_FUNC_NAME = "DisTubeNTransformFunc";

// Aynı Python’daki regexler burada
const VARIABLE_PART = /[a-zA-Z_\$][a-zA-Z_0-9\$]*/.source;


const DECIPHER_REGEXP =
  /\b([a-zA-Z0-9$]{2})\s*=\s*function\(a\)\{\s*a=a\.split\(""\);.*?return a\.join\(""\)\}/s;

const DECIPHER_ARROW_REGEXP =
  /\b([a-zA-Z0-9$]{2})\s*=\s*\(a\)\s*=>\s*\{\s*a=a\.split\(""\);.*?return a\.join\(""\)\}/s;


const HELPER_REGEXP = new RegExp(
  `var (${VARIABLE_PART})=\\{((?:.*?))\\};`, "s"
);



// Fonksiyon çıkartma
function extractDecipherFunc(jsCode) {
  const helperMatch = jsCode.match(HELPER_REGEXP);
  if (!helperMatch) throw new Error("Helper not found");
  const helperObject = helperMatch[0];
console.log(helperObject);

  let match = jsCode.match(DECIPHER_REGEXP);
if (!match) match = jsCode.match(DECIPHER_ARROW_REGEXP);

if (match) {
  console.log("Decipher function found:", match[1]);
} else {
  console.log("No decipher function found");
}
  
  const decipherFunc = match[1];
  return `${helperObject};var ${DECIPHER_FUNC_NAME}=${decipherFunc};`;
}



dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
try { app.use(favicon(path.join(__dirname, 'public','icons','icon-192.png'))); } catch(e){}




// __dirname benzeri çözüm (ESM için)

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "player.html"));
});

const cookies = `__Secure-YNID=15.YT=B_id8x69OxHdzxJGtI0WYvGdl7t4AClRGAGnYsJj3azyE7jAH-7PNPtfISCZqLOj5UOm3Sw3k-ec9Purwm6eLvg_FYtwFU57WOZ3hwnH4aW4epapJmc8AKKs9GEVgfxyIGKWypiZxnR9wxP76uFEbesWI9Qw5UQHX8N1uepyOTcYZKfOllY_HLAMgbCFrdl8778GiZ0bPuaqB6HNgaYfXa4c00OUhLx88RQNFPfVKdFxaidVqktQpOa2Z79UbRlzMKzRe3zaKedb4SsomhcU2ydp_P8sDeBsUtp6fIA5sMOGgilZ_VN1dwZC0Ltere_vcT1voomkmPzM1G3mvBzpBA; GPS=1; YSC=L2S6cQK9ljg; VISITOR_INFO1_LIVE=fOEHKyRkbJ8; VISITOR_PRIVACY_METADATA=CgJUUhIEGgAgWw%3D%3D; PREF=tz=Europe.Istanbul; HSID=AV7Gdzu6s6653zE3E; SSID=ACZH8ojLFjqXwMzLi; APISID=d9gO-w_PBGE0eEuC/AwOw7yH9bUBJjbHwo; SAPISID=sMKES3XXEv9rVEB6/AJn84noVL5tN12-pu; __Secure-1PAPISID=sMKES3XXEv9rVEB6/AJn84noVL5tN12-pu; __Secure-3PAPISID=sMKES3XXEv9rVEB6/AJn84noVL5tN12-pu; SID=g.a0005wjTyuolfy_GHKhn15rgKVR-CcDV6LEQ04qlLt83VqD5gdycxaKGJuBzk44Pgfc1tEatYwACgYKAQoSAQwSFQHGX2MidxZOfiaIDKHWtbyJrrQm_RoVAUF8yKq7VUgqnsEtELqFA3NfVh6m0076; __Secure-1PSID=g.a0005wjTyuolfy_GHKhn15rgKVR-CcDV6LEQ04qlLt83VqD5gdycbozIArH7A7UEu8CTsyFSyAACgYKAdcSAQwSFQHGX2MicS5DlR6vo81-l6PHPQrxAhoVAUF8yKrnO9yshtrkcUGOtIs2ZL410076; __Secure-3PSID=g.a0005wjTyuolfy_GHKhn15rgKVR-CcDV6LEQ04qlLt83VqD5gdycULarw7HPY_Do6p2HLlvucQACgYKATgSAQwSFQHGX2MimpprUxGf5BO5tOVNBTcj_hoVAUF8yKoGGQ-rrBYKBYJ0fkWJi5Ec0076; __Secure-1PSIDTS=sidts-CjQB7I_69LmSlKPq2MQ5lxBsU1_tjd0hMm4nE2mdWUXJOa0bC4bftvqXu6zlPoaWjUWtqDExEAA; __Secure-3PSIDTS=sidts-CjQB7I_69LmSlKPq2MQ5lxBsU1_tjd0hMm4nE2mdWUXJOa0bC4bftvqXu6zlPoaWjUWtqDExEAA; LOGIN_INFO=AFmmF2swRQIgYhh9LasxjIXUV9pL_x4x5vXnZI17_C23YPdQKUKgmAgCIQDrxQ0S3YTZyjC4HeATvt9_j6U5rY1OzaLlRGQ1ZLK9fA:QUQ3MjNmeGVqbTU4ZmQwa3NBRE80LTRLdWdOVkVDSW5pdDdTcU5YX0I1MmF3Z19SWDlCRXFnR0g4MDRLZzQwSGNGOEdTeGhjRHphM3c1YVVGYnJidnotbnJtU3JJT2NQRUFyM2ttcjZBMUV1LUhvaXRIOUlhdU1LQXJ0VW00OHlKUlgxUlNXaTN4SENSdzVwc05LWFE5SkNydjU0M2JtVVhn; __Secure-ROLLOUT_TOKEN=CKbSop3amfC-_AEQ5s-Q-qWYkgMY5Ne3lqaYkgM%3D; SIDCC=AKEyXzWXjZPBOSCYurrdfP3sdI_G-uSfdJqyoheHR8braLhdlTEQoeUnfi2YAGOtr3YQyAmkZg; __Secure-1PSIDCC=AKEyXzV7qwECBM25JxPh-Y2JBm0psUUc8HKD-XNJMp0gJUPaFopXEIaM129fy1KcyA8ZrjgK; __Secure-3PSIDCC=AKEyXzW7Gw_64kZhqtVL9goib5D8T6lZDWt11st6UmTjA4wyBzcBRuhV5RbftoJb9-W9SLii`;

await play.setToken({ youtube: { cookie: cookies } });


app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if(!q) return res.status(400).json({ error: 'Query missing' });

  try {
    const r = await yts(q);
    // sadece ilk 10 videoyu al
    const results = r.videos.slice(0,10).map(v=>({
      title: v.title,
      url: v.url,
      duration: v.timestamp,
      thumbnail: v.image,
      author: v.author.name
    }));
    res.json({ results });
  } catch(e){
    res.status(500).json({ error: 'Search failed' });
  }
});


app.get('/stream/:videoId', async (req, res) => {
  try {
    const yt = await Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true, cookie: cookies, user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' });
    const videoId = req.params.videoId;

    // Audio stream alıyoruz
    

        const stream = await yt.getStreamingData(videoId, {
      type: 'audio', // audio, video or video+audio
      quality: 'best', // best, bestefficiency, 144p, 240p, 480p, 720p and so on.
      format: 'mp4', // media container format,
          client: 'WEB_EMBEDDED'
    });

    let range = 'bytes=0-';
    // Streami direkt olarak yanıtla
   res.setHeader('Content-Type', 'audio/mp4');
    const response = await fetch(stream.url, { headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Cookie': cookies,
      'Range': range
    }
        });
    const contentRange = response.headers.get('content-range');
    const contentLength = response.headers.get('content-length');
    
  res.setHeader('Content-Range', contentRange);
      res.setHeader('Content-Length', contentLength);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'audio/mp4');
    
    response.body.pipe(res);
    // Header ayarı
       // Streami gönderiyoruz

      
    
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});


app.get('/info/:videoId', async (req, res) => {
  try {
    const yt = await Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true, cookie: cookies, user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' });
    const videoId = req.params.videoId;

    // Audio stream alıyoruz
    
const result = await yt.getBasicInfo(videoId);
        
        
      res.json({ result });
    // Header ayarı
       // Streami gönderiyoruz

      
    
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});





app.get('/health', (req, res) => res.json({ ok: true }));


app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
