"use client";

import { useEffect, useState } from "react";
import type { User } from "@/domain/entities/user";
import { authRepository } from "@/infrastructure/repositories/auth-repository";

type ProfileAvatarProps = {
  user: User;
  token: string;
  className: string;
  initials: string;
  gradient?: string;
};

export function ProfileAvatar({ user, token, className, initials, gradient = "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" }: ProfileAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (!user.profileImage) return () => undefined;

    authRepository.getProfileImage(token, user.profileImage)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) setImageUrl(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, user.profileImage]);

  return imageUrl
    ? <img src={imageUrl} alt="" className={`${className} object-cover`} />
    : <div className={`${className} flex items-center justify-center font-bold text-white`} style={{ background: gradient }}>{initials}</div>;
}
