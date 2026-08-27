type QueryFn = (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

type Migration = { id: string; sql: string };

const migrations: Migration[] = [
  {
    id: '001_users',
    sql: `CREATE TABLE IF NOT EXISTS users (
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
  },
  {
    id: '002_roles',
    sql: `CREATE TABLE IF NOT EXISTS roles (
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
  },
  {
    id: '003_attendances',
    sql: `CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (role_id, user_id)
  )`,
  },
  {
    id: '004_reviews',
    sql: `CREATE TABLE IF NOT EXISTS reviews (
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
  },
  {
    id: '005_comments',
    sql: `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  },
  {
    id: '006_reactions',
    sql: `CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, target_type, target_id)
  )`,
  },
  {
    id: '007_friendships',
    sql: `CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (requester_id, receiver_id)
  )`,
  },
  {
    id: '008_follows',
    sql: `CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (follower_id, following_id)
  )`,
  },
  {
    id: '009_albums',
    sql: `CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cover TEXT,
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  },
  {
    id: '010_photos',
    sql: `CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    caption TEXT,
    album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  },
  {
    id: '011_audios',
    sql: `CREATE TABLE IF NOT EXISTS audios (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    duration INTEGER,
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    review_id TEXT REFERENCES reviews(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  },
  {
    id: '012_music',
    sql: `CREATE TABLE IF NOT EXISTS music (
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
  },
  {
    id: '013_spotify_connections',
    sql: `CREATE TABLE IF NOT EXISTS spotify_connections (
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
  },
  {
    id: '014_posts',
    sql: `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  },
  {
    id: '015_feed_events',
    sql: `CREATE TABLE IF NOT EXISTS feed_events (
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
  },
  {
    id: '016_notifications',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  },
  {
    id: '017_user_achievements',
    sql: `CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, slug)
  )`,
  },
  {
    id: '018_idx_roles_creator',
    sql: `CREATE INDEX IF NOT EXISTS idx_roles_creator ON roles (creator_id)`,
  },
  {
    id: '019_idx_roles_date',
    sql: `CREATE INDEX IF NOT EXISTS idx_roles_date ON roles (date)`,
  },
  {
    id: '020_idx_attendances_user',
    sql: `CREATE INDEX IF NOT EXISTS idx_attendances_user ON attendances (user_id)`,
  },
  {
    id: '021_idx_comments_target',
    sql: `CREATE INDEX IF NOT EXISTS idx_comments_target ON comments (target_type, target_id)`,
  },
  {
    id: '022_idx_reactions_target',
    sql: `CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions (target_type, target_id)`,
  },
  {
    id: '023_idx_feed_created',
    sql: `CREATE INDEX IF NOT EXISTS idx_feed_created ON feed_events (created_at DESC)`,
  },
  {
    id: '024_idx_notifications_user',
    sql: `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read)`,
  },
  {
    id: '025_idx_photos_author',
    sql: `CREATE INDEX IF NOT EXISTS idx_photos_author ON photos (author_id)`,
  },
  {
    id: '026_idx_follows_following',
    sql: `CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id)`,
  },
  {
    id: '027_password_resets',
    sql: `CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  },
  {
    id: '028_idx_password_resets_user',
    sql: `CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id)`,
  },
  {
    id: '029_idx_friendships_receiver_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_friendships_receiver_status ON friendships (receiver_id, status)`,
  },
  {
    id: '030_idx_friendships_requester_status',
    sql: `CREATE INDEX IF NOT EXISTS idx_friendships_requester_status ON friendships (requester_id, status)`,
  },
  {
    id: '031_idx_photos_role',
    sql: `CREATE INDEX IF NOT EXISTS idx_photos_role ON photos (role_id)`,
  },
  {
    id: '032_idx_feed_events_actor',
    sql: `CREATE INDEX IF NOT EXISTS idx_feed_events_actor ON feed_events (actor_id)`,
  },
  {
    id: '033_idx_attendances_role',
    sql: `CREATE INDEX IF NOT EXISTS idx_attendances_role ON attendances (role_id)`,
  },
  {
    id: '034_friendships_dedupe_pair',
    sql: `DELETE FROM friendships
    WHERE id NOT IN (
      SELECT DISTINCT ON (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id)) id
      FROM friendships
      ORDER BY LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id),
        CASE status WHEN 'accepted' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
        created_at DESC
    )`,
  },
  {
    id: '035_idx_friendships_pair_unordered',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_pair_unordered
    ON friendships (LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id))`,
  },
];

export async function applyMigrations(query: QueryFn) {
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const applied = await query(`SELECT id FROM schema_migrations`);
  const done = new Set(applied.map((row) => String(row.id)));

  for (const migration of migrations) {
    if (done.has(migration.id)) continue;
    await query(migration.sql);
    await query(
      `INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING`,
      [migration.id],
    );
  }
}
