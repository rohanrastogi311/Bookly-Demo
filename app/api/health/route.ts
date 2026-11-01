import {json} from '@/lib/http';
import {config} from '@/lib/agent';
export async function GET(){return json({ok:true,ai:!!config().OPENAI_API_KEY,voice:!!config().ELEVENLABS_API_KEY,bookly:'synthetic',voiceMode:'realtime-vad',simulationClock:'2026-11-03T10:30:00Z'})}
