import express from 'express';
import cors from 'cors';
import { fakerEN, fakerDE, fakerUK, Faker } from '@faker-js/faker';
import crypto from 'crypto';
import { createCanvas } from 'canvas';

const app = express();

app.use(cors({
    origin: 'https://music-store-showcase.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

interface Song {
    index: number;
    title: string;
    artist: string;
    album: string;
    genre: string;
    likes: number;
    coverUrl: string;
    audioData: {
        tempo: number;
        key: string;
        notes: { note: string; duration: string }[];
    };
    review: string;
}

function createPrng(seedString: string) {
    let hash = crypto.createHash('sha256').update(seedString).digest('hex');
    let seedNum = parseInt(hash.substring(0, 8), 16);
    return () => {
        seedNum = (seedNum * 1664525 + 1013904223) % 4294967296;
        return seedNum / 4294967296;
    };
}

function getFaker(region: string): Faker {
    if (region === 'de') return fakerDE;
    if (region === 'uk') return fakerUK;
    return fakerEN;
}

function generateCover(title: string, artist: string, prng: () => number): string {
    const canvas = createCanvas(300, 300);
    const ctx = canvas.getContext('2d');

    const palettes = [
        ['#1e1e24', '#92140c', '#fff8f0', '#ffcf56'],
        ['#0d1b2a', '#415a77', '#778da9', '#e0e1dd'],
        ['#2b2d42', '#8d99ae', '#ef233c', '#d90429'],
        ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec']
    ];
    const palette = palettes[Math.floor(prng() * palettes.length)] || ['#1a1a1a', '#ffffff', '#333333', '#666666'];
    const bg = palette[0]!;
    const accent1 = palette[1]!;
    const accent2 = palette[2]!;
    const textColor = palette[3]!;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 300, 300);

    const styleVersion = Math.floor(prng() * 3);

    if (styleVersion === 0) {
        ctx.strokeStyle = accent1;
        ctx.lineWidth = 6;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(150, 110, 35 + i * 25, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = accent2;
        ctx.fillRect(135, 95, 30, 30);
    }
    else if (styleVersion === 1) {
        ctx.fillStyle = accent1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(200, 0);
        ctx.lineTo(100, 200);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = accent2;
        ctx.beginPath();
        ctx.arc(220, 100, 50, 0, Math.PI * 2);
        ctx.fill();
    }
    else {
        ctx.strokeStyle = accent2;
        ctx.lineWidth = 1;
        ctx.save();
        ctx.globalAlpha = 0.25;
        for (let x = 0; x < 300; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 210); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(300, x); ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = accent1;
        ctx.beginPath();
        ctx.moveTo(150, 40);
        ctx.lineTo(230, 120);
        ctx.lineTo(150, 200);
        ctx.lineTo(70, 120);
        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 210, 300, 90);

    ctx.fillStyle = accent1;
    ctx.fillRect(0, 210, 8, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    const cleanTitle = title.length > 25 ? title.substring(0, 23) + '...' : title;
    ctx.fillText(cleanTitle, 24, 248);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = textColor;
    const cleanArtist = artist.length > 30 ? artist.substring(0, 28) + '...' : artist;
    ctx.fillText(cleanArtist, 24, 276);

    return canvas.toDataURL();
}

function generateMusicData(prng: () => number) {
    const keys = ['C Major', 'A Minor', 'G Major', 'E Minor', 'F Major'];

    const keyIndex = Math.floor(prng() * keys.length);
    const chosenKey = keys[keyIndex] ?? 'C Major';

    const notesPool = chosenKey.includes('Major')
        ? ['C4', 'E4', 'G4', 'A4', 'B4', 'C5']
        : ['A3', 'C4', 'D4', 'E4', 'G4', 'A4'];

    const tempos = [60, 90, 120, 140];
    const tempoIndex = Math.floor(prng() * tempos.length);
    const tempo = tempos[tempoIndex] ?? 120;

    const notes = Array.from({ length: 8 }, () => {
        const noteIndex = Math.floor(prng() * notesPool.length);
        return {
            note: notesPool[noteIndex] ?? 'C4',
            duration: prng() > 0.4 ? '0.2s' : '0.4s'
        };
    });

    return { tempo, key: chosenKey, notes };
}

app.get('/api/songs', (req, res) => {
    const userSeed = (req.query.seed as string) || 'default';
    const page = parseInt(req.query.page as string) || 1;
    const rawLikes = parseFloat(req.query.likes as string) || 0;
    const avgLikes = Math.round(rawLikes * 10) / 10;

    const region = (req.query.region as string) || 'en';
    const limit = 20;

    const faker = getFaker(region);
    const songs: Song[] = [];

    for (let i = 0; i < limit; i++) {
        const sequenceIndex = (page - 1) * limit + i + 1;
        const coreSeed = `${userSeed}_song_${sequenceIndex}`;
        const corePrng = createPrng(coreSeed);

        faker.seed(Math.floor(corePrng() * 1000000));
        const artist = corePrng() > 0.5 ? faker.person.fullName() : `${faker.word.adjective()} ${faker.word.noun()} Band`;
        const title = faker.music.songName();
        const album = corePrng() > 0.8 ? "Single" : faker.music.album();
        const genre = faker.music.genre();
        const review = `"${faker.lorem.sentence(5)}" — ${faker.person.firstName()}`;

        const likesSeed = `${userSeed}_likes_${sequenceIndex}`;
        const likesPrng = createPrng(likesSeed);
        const integerLikes = Math.floor(avgLikes);
        const fractionalPart = avgLikes - integerLikes;
        let finalLikes = integerLikes;
        if (fractionalPart > 0 && likesPrng() < fractionalPart) {
            finalLikes += 1;
        }
        if (avgLikes === 0) {
            finalLikes = 0;
        }
        const coverUrl = generateCover(title, artist, corePrng);
        const audioData = generateMusicData(corePrng);

        songs.push({
            index: sequenceIndex,
            title,
            artist,
            album,
            genre,
            likes: finalLikes,
            coverUrl,
            audioData,
            review
        });
    }

    res.json({ page, songs });
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));