"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";

export default function LanguageWrapper() {
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}

