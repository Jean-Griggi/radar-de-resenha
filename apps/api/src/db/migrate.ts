type QueryFn = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar TEXT,
    cover TEXT,
    bio TEXT,
    city TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    show_followers BOOLEAN NOT NULL DEFAULT TRUE,
    show_interactions BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date DATE,
    time TEXT,
    location TEXT,
    category TEXT NOT NULL DEFAULT 'Outro',
    estimated_cost DOUBLE PRECISION,
    tags TEXT NOT NULL DEFAULT '[]',
    creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (role_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL,
    ratings TEXT NOT NULL DEFAULT '{}',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE (role_id, author_id)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, target_type, target_id)
  )`,
  `CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (requester_id, receiver_id)
  )`,
  `CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (follower_id, following_id)
  )`,
  `CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover TEXT,
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    caption TEXT,
    album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audios (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    duration INTEGER,
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    review_id TEXT REFERENCES reviews(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS music (
    id TEXT PRIMARY KEY,
    role_id TEXT REFERENCES roles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    cover TEXT,
    spotify_url TEXT,
    spotify_id TEXT,
    added_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS spotify_connections (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    spotify_id TEXT,
    display_name TEXT,
    product TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS feed_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id TEXT REFERENCES roles(id) ON DELETE CASCADE,
    review_id TEXT REFERENCES reviews(id) ON DELETE CASCADE,
    photo_id TEXT REFERENCES photos(id) ON DELETE CASCADE,
    audio_id TEXT REFERENCES audios(id) ON DELETE CASCADE,
    music_id TEXT REFERENCES music(id) ON DELETE CASCADE,
    post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
    achievement_slug TEXT,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, slug)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_roles_creator ON roles (creator_id)`,
  `CREATE INDEX IF NOT EXISTS idx_roles_date ON roles (date)`,
  `CREATE INDEX IF NOT EXISTS idx_attendances_user ON attendances (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_target ON comments (target_type, target_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions (target_type, target_id)`,
  `CREATE INDEX IF NOT EXISTS idx_feed_created ON feed_events (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read)`,
  `CREATE INDEX IF NOT EXISTS idx_photos_author ON photos (author_id)`,
  `CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id)`,
];

export async function applyMigrations(query: QueryFn) {
  for (const statement of statements) {
    await query(statement);
  }
}
