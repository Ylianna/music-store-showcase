import { useState, useEffect, useRef } from 'react';
import { Table, LayoutGrid, Heart, Play, Pause, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

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
    notes: { note: string; duration: string }[]
  };
  review: string;
}

export function App() {
  const [region, setRegion] = useState<string>('en');
  const [seed, setSeed] = useState<string>('42');
  const [likes, setLikes] = useState<number>(3.5);
  const [displayLikes, setDisplayLikes] = useState<number>(3.5);
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [page, setPage] = useState<number>(1);
  const [songs, setSongs] = useState<Song[]>([]);
  const [expandedSong, setExpandedSong] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const handleParamChange = (updater: () => void): void => {
    updater();
    setPage(1);
    setExpandedSong(null);
    if (viewMode === 'gallery') window.scrollTo({ top: 0 });
  };

  const handleViewModeChange = (mode: 'table' | 'gallery'): void => {
    setViewMode(mode);
    setPage(1);
    setSongs([]);
    setExpandedSong(null);
    window.scrollTo({ top: 0 });
  };

  const fetchSongs = async (currentPage: number, append: boolean = false): Promise<void> => {
    try {
      const apiUrl = 'https://music-store-showcase-27eu.onrender.com';
      const res = await fetch(
          `${apiUrl}/api/songs?seed=${seed}&page=${currentPage}&likes=${likes}&region=${region}`,
          { cache: 'no-store' }
      );
      const data = await res.json();
      setSongs(prev => append ? [...prev, ...data.songs] : data.songs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (viewMode === 'table') {
      fetchSongs(page, false);
    } else if (viewMode === 'gallery' && page === 1) {
      fetchSongs(1, false);
    }
  }, [seed, likes, region, viewMode, page]);

  useEffect(() => {
    if (viewMode !== 'gallery') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries?.[0]?.isIntersecting) {
        setPage(prev => {
          const nextPage = prev + 1;
          fetchSongs(nextPage, true);
          return nextPage;
        });
      }
    }, { threshold: 0.5 });

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [viewMode, seed, likes, region]);

const playSong = (song: Song) => {
    if (playingIndex === song.index) {
      setPlayingIndex(null);
      return;
    }
    setPlayingIndex(song.index);

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContext();
    let time = audioCtx.currentTime;

    const frequencies: { [key: string]: number } = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25, 'A3': 220.00
    };

    song.audioData.notes.forEach((n) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = frequencies[n.note] || 440;

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + parseFloat(n.duration));

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(time);
      osc.stop(time + parseFloat(n.duration));
      time += parseFloat(n.duration);
    });

    setTimeout(() => setPlayingIndex(null), time * 1000);
  };

  return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-extrabold mb-6 tracking-tight bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent">
            🎵 AI Music Store Showcase
          </h1>

          <div className="bg-slate-800 p-4 rounded-xl shadow-md border border-slate-700 flex flex-wrap gap-6 items-center mb-6">
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1 font-bold">LANGUAGE</label>
              <select className="bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600" value={region} onChange={(e) => handleParamChange(() => setRegion(e.target.value))}>
                <option value="en">English (USA)</option>
                <option value="de">German (Germany)</option>
                <option value="uk">Ukrainian (Ukraine)</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1 font-bold">SEED</label>
              <div className="flex gap-2">
                <input type="text" className="bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600 w-32" value={seed} onChange={(e) => handleParamChange(() => setSeed(e.target.value))} />
                <button onClick={() => handleParamChange(() => setSeed(Math.floor(Math.random() * 10000000).toString()))} className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg transition">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-w-[200px]">
              <label className="text-xs text-slate-400 mb-1 font-bold">AVG LIKES: {displayLikes}</label>
              <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={displayLikes}
                  onChange={(e) => setDisplayLikes(parseFloat(e.target.value))}
                  onMouseUp={() => handleParamChange(() => setLikes(displayLikes))}
                  onTouchEnd={() => handleParamChange(() => setLikes(displayLikes))}
                  className="w-full accent-teal-400"
              />
            </div>

            <div className="flex bg-slate-700 p-1 rounded-lg border border-slate-600">
              <button onClick={() => handleViewModeChange('table')} className={`px-3 py-1.5 rounded-md flex gap-2 items-center text-sm ${viewMode === 'table' ? 'bg-slate-600 text-white font-bold' : 'text-slate-400'}`}>
                <Table size={16} /> Table
              </button>
              <button onClick={() => handleViewModeChange('gallery')} className={`px-3 py-1.5 rounded-md flex gap-2 items-center text-sm ${viewMode === 'gallery' ? 'bg-slate-600 text-white font-bold' : 'text-slate-400'}`}>
                <LayoutGrid size={16} /> Gallery
              </button>
            </div>
          </div>

          {viewMode === 'table' && (
              <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                  <tr className="bg-slate-700/50 text-slate-300 text-xs tracking-wider uppercase border-b border-slate-700">
                    <th className="p-4 w-16">#</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Artist</th>
                    <th className="p-4">Album</th>
                    <th className="p-4">Genre</th>
                    <th className="p-4 w-24">Likes</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                  {songs.map((song) => (
                      <tr key={song.index} onClick={() => setExpandedSong(expandedSong === song.index ? null : song.index)} className="hover:bg-slate-700/30 cursor-pointer transition-colors">
                        <td className="p-4 text-slate-500 font-mono">{song.index}</td>
                        <td className="p-4 font-semibold text-white">{song.title}</td>
                        <td className="p-4 text-slate-300">{song.artist}</td>
                        <td className="p-4 text-slate-400">{song.album}</td>
                        <td className="p-4 text-slate-400"><span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">{song.genre}</span></td>
                        <td className="p-4 text-rose-400 font-bold flex items-center gap-1"><Heart size={14} fill="currentColor" /> {song.likes}</td>
                      </tr>
                  ))}
                  </tbody>
                </table>

                <div className="p-4 bg-slate-800/80 border-t border-slate-700 flex justify-between items-center">
                  <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 rounded-lg flex items-center gap-1 transition text-sm">
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span className="text-sm text-slate-400 font-medium">Page {page}</span>
                  <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-1 transition text-sm">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
          )}

          {viewMode === 'gallery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {songs.map((song) => (
                    <div key={song.index} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg group relative flex flex-col justify-between">
                      <div>
                        <div className="relative aspect-square overflow-hidden bg-slate-900">
                          <img src={song.coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                          <button onClick={(e) => { e.stopPropagation(); playSong(song); }} className="absolute inset-0 m-auto w-14 h-14 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-full flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition duration-200">
                            {playingIndex === song.index ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                          </button>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-white text-base truncate mb-0.5">{song.title}</h3>
                          <p className="text-slate-400 text-sm truncate">{song.artist}</p>
                          <p className="text-slate-500 text-xs italic mt-2">{song.review}</p>
                        </div>
                      </div>
                      <div className="px-4 pb-4 pt-2 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-400">
                        <span className="font-mono">#{song.index}</span>
                        <span className="flex items-center gap-1 text-rose-400 font-bold"><Heart size={12} fill="currentColor" /> {song.likes}</span>
                      </div>
                    </div>
                ))}
              </div>
          )}

          {viewMode === 'gallery' && (
              <div ref={loaderRef} className="h-12 w-full flex items-center justify-center text-slate-500 text-sm mt-6">
                Loading more songs...
              </div>
          )}

          {expandedSong !== null && viewMode === 'table' && (
              (() => {
                const currentSong = songs.find(s => s.index === expandedSong);
                if (!currentSong) return null;
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setExpandedSong(null)}>
                      <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <img src={currentSong.coverUrl} className="w-full aspect-square rounded-xl object-cover mb-4 shadow-lg" alt="" />
                        <h2 className="text-xl font-bold text-white truncate">{currentSong.title}</h2>
                        <p className="text-slate-400 text-sm mb-3">{currentSong.artist}</p>
                        <p className="text-slate-500 text-xs bg-slate-900/50 p-3 rounded-lg border border-slate-700/40 italic mb-4">{currentSong.review}</p>
                        <div className="flex gap-4 items-center">
                          <button onClick={() => playSong(currentSong)} className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition">
                            {playingIndex === currentSong.index ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />} Play Preview
                          </button>
                          <button onClick={() => setExpandedSong(null)} className="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-xl transition text-sm">Close</button>
                        </div>
                      </div>
                    </div>
                );
              })()
          )}
        </div>
      </div>
  );
}