import type {
  ATTENDANCE_STATUSES,
  COMMENT_TARGET_TYPES,
  FEED_EVENT_TYPES,
  FRIENDSHIP_STATUSES,
  MEDIA_KINDS,
  NOTIFICATION_TYPES,
  REACTION_TARGET_TYPES,
  REACTION_TYPES,
  REVIEW_RATING_CATEGORIES,
  ROLE_CATEGORIES,
  ROLE_STATUSES,
} from './constants';

export type RoleCategory = (typeof ROLE_CATEGORIES)[number];
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type RoleStatus = (typeof ROLE_STATUSES)[number];
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];
export type ReactionType = (typeof REACTION_TYPES)[number];
export type ReviewRatingCategory = (typeof REVIEW_RATING_CATEGORIES)[number];
export type CommentTargetType = (typeof COMMENT_TARGET_TYPES)[number];
export type ReactionTargetType = (typeof REACTION_TARGET_TYPES)[number];
export type FeedEventType = (typeof FEED_EVENT_TYPES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type MediaKind = (typeof MEDIA_KINDS)[number];

export type PublicUser = {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar: string | null;
  cover: string | null;
  bio: string | null;
  city: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = PublicUser & {
  email: string;
  stats: UserStats;
  friendship: FriendshipPreview | null;
  isFollowing: boolean;
  isMe: boolean;
  achievements: Achievement[];
};

export type UserStats = {
  roles: number;
  reviews: number;
  friends: number;
  followers: number;
  following: number;
};

export type AuthUser = PublicUser & {
  email: string;
};

export type Attendance = {
  id: string;
  roleId: string;
  userId: string;
  user: PublicUser;
  status: AttendanceStatus;
  createdAt: string;
};

export type Comment = {
  id: string;
  authorId: string;
  author: PublicUser;
  targetType: CommentTargetType;
  targetId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  reactions?: ReactionSummary[];
};

export type ReactionSummary = {
  type: ReactionType;
  count: number;
  reacted: boolean;
};

export type Role = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  category: RoleCategory;
  estimatedCost: number | null;
  tags: string[];
  creatorId: string;
  creator: PublicUser;
  status: RoleStatus;
  createdAt: string;
  updatedAt: string;
  goingCount: number;
  maybeCount: number;
  notGoingCount: number;
  commentCount: number;
  averageRating: number | null;
  coverPhoto: string | null;
};

export type RoleMusic = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  cover: string | null;
  spotifyUrl: string | null;
  spotifyId: string | null;
};

export type RoleDetail = Role & {
  attendances: Attendance[];
  comments: Comment[];
  photos: Photo[];
  audios: AudioClip[];
  music: RoleMusic[];
  review: Review | null;
  reactions: ReactionSummary[];
  myAttendance: AttendanceStatus | null;
};

export type Review = {
  id: string;
  roleId: string;
  authorId: string;
  author: PublicUser;
  title: string;
  content: string;
  rating: number;
  ratings: Partial<Record<ReviewRatingCategory, number>>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  role?: Pick<Role, 'id' | 'title' | 'date' | 'location' | 'category'>;
  comments?: Comment[];
  reactions?: ReactionSummary[];
  photos?: Photo[];
  audios?: AudioClip[];
};

export type FriendshipPreview = {
  id: string;
  status: FriendshipStatus;
  requesterId: string;
  receiverId: string;
};

export type Friendship = FriendshipPreview & {
  requester: PublicUser;
  receiver: PublicUser;
  createdAt: string;
};

export type Photo = {
  id: string;
  url: string;
  caption: string | null;
  albumId: string | null;
  roleId: string | null;
  authorId: string;
  author?: PublicUser;
  createdAt: string;
};

export type Album = {
  id: string;
  name: string;
  description: string | null;
  cover: string | null;
  roleId: string | null;
  authorId: string;
  photos: Photo[];
  createdAt: string;
};

export type AudioClip = {
  id: string;
  url: string;
  name: string;
  duration: number | null;
  roleId: string | null;
  reviewId: string | null;
  authorId: string;
  author?: PublicUser;
  createdAt: string;
};

export type FeedItem = {
  id: string;
  type: FeedEventType;
  actor: PublicUser;
  createdAt: string;
  role?: Role;
  review?: Review;
  photo?: Photo;
  audio?: AudioClip;
  music?: RoleMusic;
  achievement?: Achievement;
  post?: SocialPost;
  reactions: ReactionSummary[];
  commentCount: number;
};

export type SocialPost = {
  id: string;
  authorId: string;
  author: PublicUser;
  content: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  type: NotificationType;
  read: boolean;
  actor: PublicUser | null;
  message: string;
  link: string | null;
  createdAt: string;
};

export type Achievement = {
  slug: string;
  name: string;
  description: string;
  unlockedAt: string | null;
};

export type CalendarEvent = {
  id: string;
  roleId: string;
  title: string;
  date: string;
  time: string | null;
  status: RoleStatus;
  category: RoleCategory;
  location: string | null;
  attendance: AttendanceStatus | null;
};

export type SearchResults = {
  people: PublicUser[];
  roles: Role[];
  reviews: Review[];
  tags: string[];
  places: string[];
  music: RoleMusic[];
};

export type StatsOverview = {
  totalRoles: number;
  totalReviews: number;
  participations: number;
  friends: number;
  placesVisited: number;
  rolesByMonth: { month: string; count: number }[];
  rolesByCategory: { category: string; count: number }[];
  rolesByWeekday: { weekday: string; count: number }[];
  hourDistribution: { hour: string; count: number }[];
  ratingsAverage: number | null;
  ratingsByCategory: Partial<Record<ReviewRatingCategory, number>>;
  topPlaces: { name: string; count: number }[];
  topPeople: { user: PublicUser; count: number }[];
  topArtists: { name: string; count: number }[];
  topTracks: { title: string; artist: string; count: number }[];
};

export type YearReview = {
  year: number;
  totalRoles: number;
  places: number;
  people: number;
  reviews: number;
  busiestMonth: string | null;
  favoriteGenre: string | null;
  topTrack: { title: string; artist: string } | null;
  topPartner: PublicUser | null;
  topCategory: string | null;
  highlights: Role[];
};

export type SpotifyAccount = {
  connected: boolean;
  displayName: string | null;
  product: string | null;
  nowPlaying: {
    title: string;
    artist: string;
    album: string | null;
    cover: string | null;
    spotifyUrl: string | null;
    isPlaying: boolean;
  } | null;
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  image: string | null;
  tracks: number;
  url: string;
};
