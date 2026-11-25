export interface RoomRect {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  has_camera: boolean;
  camera_angle: number;
}

export interface SceneHotspot {
  id: string;
  room_id: string;
  label: string;
  x: number;
  y: number;
  uv_only: boolean;
  evidence_id: string;
  inspect_text: string;
  inspect_kind: 'frame_flip' | 'torn_note' | 'uv_macro' | 'terminal' | string;
}

export interface InspectableProps {
  frame_front_title: string;
  frame_front_subtitle: string;
  frame_back_handwriting: string;
  torn_note_fragments: string[];
  torn_note_full: string;
}

export interface ConfrontationResult {
  dramatic_hit: boolean;
  pulse_spike: number;
  dialogue: string[];
  revealed_secret: string | null;
  unlocked_evidence_id: string | null;
}

export interface PinnedQuote {
  id: string;
  suspectName: string;
  text: string;
}

export interface EvidenceItem {
  id: string;
  code: string;
  title: string;
  category: 'forensic' | 'digital' | 'physical' | 'secret' | string;
  summary: string;
  detail: string;
  timestamp: string | null;
  suspect_id: string | null;
  unlocked_by_default: boolean;
  unlock_source: string;
  is_uv_trace: boolean;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  answer: string;
  pulse_bump: number;
}

export interface Statement {
  id: string;
  act: number;
  text: string;
  press_reply: string;
  is_lie: boolean;
  contradicted_by: string | null;
  break_reply: string | null;
  reveals_secret: string | null;
}

export interface TimelineEntry {
  suspect_id: string;
  start_min: number;
  end_min: number;
  location: string;
  is_claimed: boolean;
  evidence_id: string | null;
}

export interface Suspect {
  id: string;
  portrait_index: number;
  name: string;
  role: string;
  age: number;
  handedness: string;
  blood_type: string;
  archetype_tag: string;
  portrait_accent: string;
  base_pulse: number;
  alibi_summary: string;
  statements: Statement[];
  follow_ups: FollowUpQuestion[];
}

export interface PhoneMessage {
  sender: string;
  time: string;
  text: string;
  deleted: boolean;
}

export interface PhonePuzzle {
  owner_name: string;
  hint_text: string;
  pin_length: number;
  unlocked_evidence_ids: string[];
  messages: PhoneMessage[];
}

export interface CellTower {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
}

export interface TriangulationPuzzle {
  target_suspect_name: string;
  signal_time: string;
  towers: CellTower[];
  target_x: number;
  target_y: number;
  tolerance: number;
  location_name: string;
  unlocked_evidence_id: string;
}

export interface AutopsyPuzzle {
  body_temp_c: number;
  ambient_temp_c: number;
  found_time_str: string;
  rigor_stage: string;
  livor_stage: string;
  onset_delay_min: number;
  forensic_notes: string;
  true_death_start_min: number;
  true_death_end_min: number;
  unlocked_evidence_id: string;
}

export interface AudioPuzzle {
  channel_name: string;
  recorded_at: string;
  target_freq: number;
  target_threshold: number;
  clean_transcript: string;
  unlocked_evidence_id: string;
}

export interface CctvPuzzle {
  camera_label: string;
  target_frame: number;
  anomaly_time: string;
  anomaly_desc: string;
  unlocked_evidence_id: string;
}

export interface ChemCompound {
  id: string;
  name: string;
  bars: number[];
  effect: string;
}

export interface ChemPuzzle {
  sample_label: string;
  unknown_bars: number[];
  compounds: ChemCompound[];
  correct_compound_id: string;
  unlocked_evidence_id: string;
}

export interface SafePuzzle {
  label: string;
  hint_text: string;
  unlocked_evidence_id: string;
  contents_summary: string;
}

export interface BodyZone {
  id: string;
  label: string;
  x: number;
  y: number;
  finding: string;
  critical: boolean;
}

export interface BodyMapPuzzle {
  subject_label: string;
  zones: BodyZone[];
  unlocked_evidence_id: string;
}

export type DifficultyMode = 'detective' | 'homicide' | 'timed';

export interface CaseFile {
  seed: string;
  case_code: string;
  difficulty: DifficultyMode | string;
  max_hints: number;
  max_reputation: number;
  time_limit_sec: number | null;
  crime_type: string;
  crime_badge: string;
  scene_weather: 'rain' | 'blackout' | 'fog' | string;
  venue_index: number;
  title: string;
  venue_name: string;
  venue_subtitle: string;
  date_str: string;
  victim_name: string;
  victim_role: string;
  victim_age: number;
  briefing: string;
  inspectable_props: InspectableProps;
  rooms: RoomRect[];
  hotspots: SceneHotspot[];
  suspects: Suspect[];
  evidence: EvidenceItem[];
  timeline: TimelineEntry[];
  phone_puzzle: PhonePuzzle;
  triangulation_puzzle: TriangulationPuzzle;
  autopsy_puzzle: AutopsyPuzzle;
  audio_puzzle: AudioPuzzle;
  cctv_puzzle: CctvPuzzle;
  chem_puzzle: ChemPuzzle;
  safe_puzzle: SafePuzzle;
  body_map_puzzle: BodyMapPuzzle;
  hints: string[];
  act2_drop_title: string;
  act2_drop_body: string;
}

export interface PresentResult {
  hit: boolean;
  pulse_delta: number;
  reply: string;
  revealed_secret: string | null;
  reputation_delta: number;
}

export interface PinVerifyResult {
  unlocked: boolean;
  message: string;
  unlocked_evidence_ids: string[];
}

export interface AccusationSubmission {
  seed: string;
  verdict_type: 'single_culprit' | 'accomplice' | 'accident_suicide';
  killer_id: string;
  accomplice_id: string | null;
  method_evidence_id: string;
  alibi_evidence_id: string;
  motive_evidence_id: string;
}

export interface LockCheck {
  label: string;
  correct: boolean;
  expected_hint: string;
}

export interface AccusationResult {
  solved: boolean;
  score: number;
  rank: string;
  resolution_type: string;
  locks: LockCheck[];
  killer_name: string;
  accomplice_name: string | null;
  method_summary: string;
  motive_summary: string;
  chronological_reveal: string[];
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiInterrogateRequest {
  seed: string;
  suspect_id: string;
  user_message: string;
  history: AiChatMessage[];
  presented_evidence_ids: string[];
  broken_statement_ids: string[];
  endpoint_url: string;
  model_name: string;
  api_key?: string | null;
}

export interface AiInterrogateResponse {
  reply: string;
  pulse_hint: number;
  used_model: string;
}

export interface OllamaStatus {
  online: boolean;
  models: string[];
  error: string | null;
}

export interface BoardNodePos {
  id: string;
  x: number;
  y: number;
}

export interface BoardLink {
  id: string;
  from: string;
  to: string;
  label: 'ÇELİŞKİ' | 'BAĞLANTI' | 'ALİBİ';
  color: string;
}

export type DeskTab = 'scene' | 'forensics' | 'board' | 'timeline' | 'interrogation';

export interface CareerRecord {
  seed: string;
  title: string;
  crime_type: string;
  difficulty: string;
  solved: boolean;
  score: number;
  rank: string;
  elapsed_sec: number;
  date_iso: string;
}

export interface CampaignChapter {
  chapter: number;
  seed: string;
  code: string;
  title: string;
  subtitle: string;
  venue_hint: string;
  difficulty: DifficultyMode | string;
  synopsis: string;
  signature_clue_title: string;
  signature_clue_detail: string;
}

export interface CareerStats {
  xp: number;
  solvedCount: number;
  attemptedCount: number;
  perfectCount: number;
  history: CareerRecord[];
}

export function getPortraitUrl(portraitIndex: number): string {
  // Backend now assigns strictly unique 0..4 per case
  return `/assets/portraits/p${portraitIndex % 5}.jpg`;
}

export function getSceneUrl(venueIndex: number): string {
  return `/assets/scenes/venue_${venueIndex % 6}.jpg`;
}

export function formatMinutesFrom19(min: number): string {
  const total = 19 * 60 + Math.round(min);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
