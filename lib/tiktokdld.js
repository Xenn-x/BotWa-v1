import axios from 'axios'

export async function tiktok2(query) {
    return new Promise(async (resolve, reject) => {
        try {
            // ---------------------------------------------------------
            // TAHAP 1: Request ke API TikWM (Pakai Header Lengkap)
            // ---------------------------------------------------------
            const encodedParams = new URLSearchParams();
            encodedParams.set('url', query);
            encodedParams.set('hd', '1');

            const apiHeaders = {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': 'current_language=en',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
            };

            const response = await axios({
                method: 'POST',
                url: 'https://www.tikwm.com/api/',
                headers: apiHeaders, // Header buat API
                data: encodedParams
            });

            const videos = response.data.data;
            
            if (!videos) {
                reject('Data tidak ditemukan. Link private atau salah?');
                return;
            }

            // Fix Link Buntung
            let videoUrl = videos.play;
            if (!videoUrl.startsWith('https')) {
                videoUrl = `https://www.tikwm.com${videoUrl}`;
            }

            // ---------------------------------------------------------
            // TAHAP 2: Download Video (Pakai Header Beda/Bersih)
            // ---------------------------------------------------------
            // Kita cuma butuh User-Agent biar dikira Browser HP. 
            // JANGAN bawa Cookie TikWM ke sini, nanti kena ECONNRESET lagi.
            rResponse = await axios({
                method: 'GET',
                url: videoUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
                },
                responseType: 'arraybuffer' // Wajib arraybuffer buat video
            });

            const result = {
                title: videos.title,
                cover: videos.cover,
                origin_cover: videos.origin_cover,
                no_watermark: videoUrl,
                videoBuffer: bufferResponse.data, // Hasil download bersih
                watermark: videos.wmplay,
                music: videos.music,
                author: videos.author ? videos.author.nickname : 'TikTok User'
            };

            resolve(result);

        } catch (error) {
            // Cek detail error biar gampang debugging
            if (error.response) {
                console.error(`Error ${error.response.status}:`, error.response.data);
            } else {
                console.error('Error TikTok:', error.message);
            }
            reject(error);
        }
    });
}