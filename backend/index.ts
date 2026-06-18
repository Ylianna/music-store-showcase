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

    const colors = ['#ff0055', '#00ffcc', '#ffcc00', '#9900ff', '#ff5722', '#3f51b5'];

    const c1 = colors[Math.floor(prng() * colors.length)] ?? '#ff0055';
    const c2 = colors[Math.floor(prng() * colors.length)] ?? '#3f51b5';

    const gradient = ctx.createLinearGradient(0, 0, 300, 300);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 300);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(prng() * 300, prng() * 300, prng() * 100 + 50, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Sans-serif';
    ctx.fillText(title.substring(0, 22), 20, 240);
    ctx.font = '14px Sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(artist.substring(0, 28), 20, 265);

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