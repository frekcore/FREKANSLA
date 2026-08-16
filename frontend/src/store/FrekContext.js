import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { FrekAudioEngine } from "@/audio/AudioEngine";
import { getIdentity } from "@/lib/frekApi";

const FrekContext = createContext(null);
export const useFrek = () => useContext(FrekContext);

const DEFAULT_MACROS = {
  warm_analog: 30,
  intention_morph_x: 0.5,
  intention_morph_y: 0.5,
  harmonic_aggression: 15,
  spatial_depth: 40,
};

export function FrekProvider({ children }) {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new FrekAudioEngine();

  const [identity, setIdentity] = useState(null);
  const [macros, setMacros] = useState(DEFAULT_MACROS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceType, setSourceType] = useState("synth");
  const [fileName, setFileName] = useState(null);
  const [duration, setDuration] = useState(8.0);
  const [sessionTitle, setSessionTitle] = useState("Aurora Grit");
  const [lastObject, setLastObject] = useState(null);
  const [vintage, setVintage] = useState({
    eq_low: 50, eq_mid: 50, eq_high: 50, eq_freq: 40, bypass: false,
    comp_threshold: 60, comp_ratio: 30, comp_attack: 20, comp_release: 40, comp_makeup: 20,
    sat_drive: 25, sat_bright: false,
  });

  const setVintageParam = useCallback((name, value) => {
    engineRef.current.setVintage(name, value);
    setVintage((v) => ({ ...v, [name]: value }));
  }, []);

  useEffect(() => {
    getIdentity().then(setIdentity).catch(() => {});
  }, []);

  const setMacro = useCallback((name, value) => {
    engineRef.current.setMacro(name, value);
    setMacros((m) => ({ ...m, [name]: value }));
  }, []);

  const play = useCallback(async () => {
    await engineRef.current.play();
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    engineRef.current.stop();
    setIsPlaying(false);
  }, []);

  const loadFile = useCallback(async (file) => {
    const info = await engineRef.current.loadFile(file);
    setSourceType("file");
    setFileName(file.name);
    setDuration(info.duration);
  }, []);

  const useSynth = useCallback(() => {
    engineRef.current.stop();
    engineRef.current.setSourceType("synth");
    setSourceType("synth");
    setFileName(null);
    setIsPlaying(false);
  }, []);

  const value = {
    engine: engineRef.current,
    identity,
    macros,
    setMacro,
    isPlaying,
    play,
    stop,
    sourceType,
    fileName,
    duration,
    loadFile,
    useSynth,
    sessionTitle,
    setSessionTitle,
    lastObject,
    setLastObject,
    vintage,
    setVintageParam,
  };

  return <FrekContext.Provider value={value}>{children}</FrekContext.Provider>;
}
