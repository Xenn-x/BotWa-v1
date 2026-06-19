import axios from 'axios'

export async function tiktok2(query) {
    return new Promise(async (resolve, reject) => {
        try {
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
                headers: apiHeaders, 
                data: encodedParams
            });

            const videos = response.data.data;
            
            if (!videos) {
                reject('Data tidak ditemukan. Link private atau salah?');
                return;
            }

            // 🔥 CEK MODE: Apakah ini postingan foto slide?
            const isPhoto = videos.images && videos.images.length > 0;

            let result = {
                title: videos.title,
                author: videos.author ? videos.author.nickname : 'TikTok User',
                music: videos.music,
                isPhoto: isPhoto // Kasih tanda ke bot kalau ini foto
            };

            if (isPhoto) {
                // Kalau wujudnya foto, oper kumpulan link gambarnya
                result.images = videos.images;
            } else {
                // Kalau wujudnya video, baru kita sedot buffernya
                let videoUrl = videos.play;
                if (!videoUrl.startsWith('https')) {
                    videoUrl = `https://www.tikwm.com${videoUrl}`;
                }

                const bufferResponse = await axios({
                    method: 'GET',
                    url: videoUrl,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
                    },
                    responseType: 'arraybuffer' 
                });
                result.videoBuffer = bufferResponse.data;
            }

            resolve(result);

        } catch (error) {
            reject(error);
        }
    });
}