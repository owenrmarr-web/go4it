"use client";

interface UserAvatarProps {
  name: string;
  image?: string | null;
  avatarUrl?: string | null;
  profileColor?: string | null;
  profileEmoji?: string | null;
  avatarColor?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const sizeClasses = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
};

export default function UserAvatar({
  name,
  image,
  avatarUrl,
  profileColor,
  profileEmoji,
  avatarColor,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const imgUrl = image || avatarUrl;
  const emoji = !imgUrl ? profileEmoji : null;
  const hexBg = profileColor || null;
  const isHex = !!hexBg?.startsWith("#");
  const twClass = avatarColor || getAvatarColor(name);
  const initials = getInitials(name);

  if (imgUrl) {
    return (
      <div
        className={`rounded-lg overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`}
        title={name}
      >
        <img
          src={imgUrl}
          alt={name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
    );
  }

  if (emoji) {
    return (
      <div
        className={`rounded-lg flex items-center justify-center flex-shrink-0 ${sizeClasses[size]} ${className}`}
        style={isHex ? { backgroundColor: hexBg! } : undefined}
        title={name}
      >
        {emoji}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0 ${sizeClasses[size]} ${!isHex ? twClass : ""} ${className}`}
      style={isHex ? { backgroundColor: hexBg! } : undefined}
      title={name}
    >
      {initials}
    </div>
  );
}
