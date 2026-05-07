/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Info, Upload, Camera, Sparkles, MapPin, Loader2, RefreshCw, Palette, Zap, ShieldCheck, Droplets, Sun, Wind, CheckCircle2, AlertTriangle, Stethoscope, HeartPulse } from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
type Tab = "inspiração" | "simulação" | "calculadora" | "cuidados" | "saúde";

interface TattooAnalysis {
  style: string;
  trace: string;
  shading: string;
  characteristics: string[];
  description: string;
}

interface FlashVariation {
  title: string;
  description: string;
  elements: string[];
  composition: string;
}

// --- AI Service ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const analyzeTattooImage = async (base64Image: string): Promise<TattooAnalysis> => {
  const model = genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Analise esta imagem de tatuagem e retorne os detalhes técnicos no formato JSON. Inclua: estilo (ex: American Traditional), traço (ex: Bold), sombreamento, uma lista de 5-6 características principais (tags) e uma breve descrição poética/técnica." },
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(",")[1] } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING },
          trace: { type: Type.STRING },
          shading: { type: Type.STRING },
          characteristics: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING }
        },
        required: ["style", "trace", "shading", "characteristics", "description"]
      }
    }
  });

  const result = await model;
  return JSON.parse(result.text || "{}");
};

const searchArtists = async (style: string) => {
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Encontre estúdios de tatuagem especializados em ${style} no Brasil. Liste os nomes e links do Google Maps.`,
    config: {
      tools: [{ googleMaps: {} }]
    }
  });
  
  // Extract grounding chunks for links
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  return {
    text: response.text,
    links: chunks?.map(c => c.maps?.uri).filter(Boolean) || []
  };
};

const simulateTattooOnBody = async (bodyBase64: string, tattooBase64: string): Promise<string> => {
  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: bodyBase64.split(",")[1], mimeType: "image/jpeg" } },
        { inlineData: { data: tattooBase64.split(",")[1], mimeType: "image/jpeg" } },
        { text: 'Você é um mestre tatuador especialista em simulações digitais. Sua tarefa é aplicar a tatuagem da segunda imagem na parte do corpo mostrada na primeira imagem. A tatuagem deve parecer 100% real, fundindo-se com a pele, respeitando a anatomia, os poros, a iluminação e a curvatura do corpo. Ajuste a perspectiva para que a arte pareça estar realmente tatuada. Mantenha a fidelidade total ao desenho original da tatuagem.' },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Falha ao gerar simulação");
};

const generateFlashSheetVariations = async (base64Image: string): Promise<FlashVariation[]> => {
  const model = genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { text: "Com base nesta imagem de tatuagem, crie 4 variações conceituais para uma 'Flash Sheet'. Retorne um JSON com um array de 4 objetos, cada um contendo: title (título criativo), description (descrição da mudança), elements (lista de elementos visuais novos) e composition (como os elementos se organizam)." },
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(",")[1] } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            elements: { type: Type.ARRAY, items: { type: Type.STRING } },
            composition: { type: Type.STRING }
          },
          required: ["title", "description", "elements", "composition"]
        }
      }
    }
  });

  const result = await model;
  return JSON.parse(result.text || "[]");
};

// --- Components ---

const Header = ({ activeTab, setActiveTab }: { activeTab: Tab; setActiveTab: (t: Tab) => void }) => (
  <header className="pt-12 pb-8 px-4 text-center">
    <div className="mb-2">
      <h1 className="text-7xl md:text-8xl gothic-title text-[#c5a059] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] tracking-tighter">
        TATTOO-FINDER
      </h1>
      <p className="text-2xl gothic-title text-[#1a1a1a] mt-[-10px]">
        Gustavo Guazzelli Felix
      </p>
    </div>

    <nav className="mt-12 flex justify-center gap-8 md:gap-12 border-b border-black/10 pb-2 flex-wrap">
      {[
        { id: "inspiração", label: "Encontrar Artista" },
        { id: "simulação", label: "Simulação Virtual" },
        { id: "calculadora", label: "Orçamento" },
        { id: "cuidados", label: "Guia de Cuidados" },
        { id: "saúde", label: "Saúde & Alergia" },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as Tab)}
          className={`relative pb-2 text-lg font-bold gothic-title transition-colors ${
            activeTab === tab.id ? "text-[#a31d1d]" : "text-gray-600 hover:text-black"
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#a31d1d]"
            />
          )}
        </button>
      ))}
    </nav>
  </header>
);

const InspirationTab = ({ onTattooAnalyzed }: { onTattooAnalyzed: (img: string) => void }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TattooAnalysis | null>(null);
  const [artists, setArtists] = useState<{text: string, links: string[]} | null>(null);
  const [flashSheet, setFlashSheet] = useState<FlashVariation[] | null>(null);
  const [loadingFlash, setLoadingFlash] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const initCamera = async () => {
      if (isCameraActive) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Erro ao acessar a câmera:", err);
          setIsCameraActive(false);
          alert("Não foi possível acessar a câmera. Verifique as permissões.");
        }
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    };
    initCamera();
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const processImage = async (base64: string) => {
    setImage(base64);
    setLoading(true);
    setFlashSheet(null);
    try {
      const result = await analyzeTattooImage(base64);
      setAnalysis(result);
      onTattooAnalyzed(base64);
      const artistResult = await searchArtists(result.style);
      setArtists(artistResult);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = () => {
    setIsCameraActive(true);
  };

  const stopCamera = () => {
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg");
        processImage(base64);
        stopCamera();
      }
    }
  };

  const handleGenerateFlash = async () => {
    if (!image) return;
    setLoadingFlash(true);
    try {
      const variations = await generateFlashSheetVariations(image);
      setFlashSheet(variations);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFlash(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto p-6"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#a31d1d]">
            <Star className="fill-current w-5 h-5" />
            <h2 className="text-3xl gothic-title">SUA INSPIRAÇÃO</h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => isCameraActive ? stopCamera() : startCamera()}
              className={`p-2 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-colors ${isCameraActive ? 'bg-[#a31d1d] text-white' : 'bg-white text-black hover:bg-gray-100'}`}
              title={isCameraActive ? "Fechar Câmera" : "Usar Câmera"}
            >
              <Camera className="w-5 h-5" />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 border-2 border-black bg-white text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-gray-100 transition-colors"
              title="Upload de Imagem"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div 
          className="bg-white p-2 shadow-[8px_8px_0px_rgba(0,0,0,1)] border-2 border-black aspect-square overflow-hidden relative flex items-center justify-center"
        >
          {isCameraActive ? (
            <div className="w-full h-full relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover grayscale contrast-125"
              />
              <button 
                onClick={capturePhoto}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#a31d1d] text-white gothic-title px-6 py-2 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform"
              >
                ESCANEAR TATTOO
              </button>
            </div>
          ) : image ? (
            <img src={image} alt="Inspiration" className="w-full h-full object-cover grayscale contrast-125" />
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="text-center space-y-4 cursor-pointer group w-full h-full flex flex-col items-center justify-center"
            >
              <Sparkles className="w-12 h-12 mx-auto text-gray-400 group-hover:text-[#a31d1d] transition-colors" />
              <p className="gothic-title text-xl text-gray-400">Envie ou Escaneie sua tatuagem</p>
            </div>
          )}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
          )}
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />

        {analysis && (
          <div className="space-y-6">
            <div className="bg-[#f0e9df] border-2 border-black p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-black/20 pb-2">
                <Info className="w-5 h-5 text-[#a31d1d]" />
                <h3 className="text-xl gothic-title">Estilo: {analysis.style}</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Traço</p>
                  <p className="font-bold text-lg">{analysis.trace}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Sombreamento</p>
                  <p className="font-bold leading-tight">{analysis.shading}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Características</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.characteristics.map(tag => (
                    <span key={tag} className="bg-black text-white text-[10px] font-bold px-2 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#e9e1d4] p-4 border border-black/10">
                <p className="serif-quote text-sm leading-relaxed">
                  "{analysis.description}"
                </p>
              </div>
            </div>

            <button 
              onClick={handleGenerateFlash}
              disabled={loadingFlash}
              className="w-full bg-[#c5a059] text-black border-2 border-black py-4 gothic-title text-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loadingFlash ? <Loader2 className="animate-spin" /> : <Sparkles className="w-6 h-6" />}
              GERAR FLASH SHEET (VARIAÇÕES)
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {flashSheet ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[#a31d1d]">
              <Zap className="fill-current w-5 h-5" />
              <h2 className="text-3xl gothic-title">FLASH SHEET CONCEITUAL</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flashSheet.map((v, i) => (
                <div key={i} className="bg-white border-2 border-black p-4 space-y-3 shadow-[4px_4px_0px_rgba(197,160,89,1)]">
                  <h4 className="gothic-title text-lg border-b border-black/10 pb-1">{v.title}</h4>
                  <p className="text-xs serif-quote leading-tight text-gray-600">{v.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {v.elements.map(el => (
                      <span key={el} className="text-[9px] bg-[#f0e9df] px-1 border border-black/20 font-bold uppercase">{el}</span>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-black/5">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Composição:</p>
                    <p className="text-[10px] italic">{v.composition}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-center text-gray-500 uppercase font-bold">
              * Estas são variações conceituais baseadas na sua referência original.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-[#a31d1d]">
              <Star className="fill-current w-5 h-5" />
              <h2 className="text-3xl gothic-title">ARTISTAS RECOMENDADOS</h2>
            </div>
            <div className="bg-[#f0e9df] border-2 border-black p-6 min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-gray-400 italic">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p>Analisando estilo e buscando artistas...</p>
                </div>
              ) : artists ? (
                <div className="space-y-6">
                  <div className="prose prose-sm max-w-none">
                    <p className="serif-quote text-lg">{artists.text}</p>
                  </div>
                  {artists.links.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Links do Google Maps</p>
                      <div className="flex flex-col gap-2">
                        {artists.links.map((link, i) => (
                          <a 
                            key={i} 
                            href={link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-2 text-[#a31d1d] hover:underline font-bold"
                          >
                            <MapPin className="w-4 h-4" />
                            Ver no Maps
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 italic text-center px-8">
                  <MapPin className="w-12 h-12 mb-4 opacity-20" />
                  <p>Envie uma foto para receber recomendações personalizadas de artistas na sua região.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

const SimulationTab = ({ referenceImage }: { referenceImage: string | null }) => {
  const [bodyImage, setBodyImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !referenceImage) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setBodyImage(base64);
      setLoading(true);
      try {
        const result = await simulateTattooOnBody(base64, referenceImage);
        setResultImage(result);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 space-y-12"
    >
      <div className="text-center space-y-2">
        <h2 className="text-5xl gothic-title text-[#a31d1d]">SIMULAÇÃO VIRTUAL</h2>
        <p className="serif-quote text-lg text-gray-600">Veja a arte ganhar vida na sua pele antes da agulha tocar.</p>
      </div>

      {!referenceImage && (
        <div className="bg-yellow-100 border-2 border-yellow-600 p-4 text-yellow-800 text-center gothic-title">
          Aviso: Envie primeiro uma inspiração na aba "Encontrar Artista" para simular.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
            <h3 className="text-xl gothic-title">Foto da Região</h3>
          </div>
          <div 
            onClick={() => referenceImage && fileInputRef.current?.click()}
            className={`border-2 border-black bg-white aspect-[3/4] relative overflow-hidden flex items-center justify-center cursor-pointer group ${!referenceImage && 'opacity-50 cursor-not-allowed'}`}
          >
            {bodyImage ? (
              <img src={bodyImage} alt="Body Part" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center space-y-4">
                <Camera className="w-12 h-12 mx-auto text-gray-400 group-hover:text-[#a31d1d] transition-colors" />
                <p className="gothic-title text-xl text-gray-400">Tire uma foto da região</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
              <h3 className="text-xl gothic-title">Resultado</h3>
            </div>
            {resultImage && (
              <button 
                onClick={() => setResultImage(null)}
                className="bg-[#a31d1d] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-tighter shadow-[3px_3px_0px_rgba(0,0,0,1)]"
              >
                Limpar Simulação
              </button>
            )}
          </div>
          <div className="border-2 border-black bg-white aspect-[3/4] relative overflow-hidden flex items-center justify-center">
            {loading ? (
              <div className="text-center space-y-4">
                <Sparkles className="w-12 h-12 mx-auto text-[#c5a059] animate-pulse" />
                <p className="gothic-title text-xl text-gray-400">O mestre está desenhando...</p>
                <p className="text-[10px] uppercase font-bold text-gray-500 animate-pulse">Ajustando perspectiva e iluminação</p>
              </div>
            ) : resultImage ? (
              <img src={resultImage} alt="Simulated Result" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center space-y-4 px-8">
                <Palette className="w-12 h-12 mx-auto text-gray-200" />
                <p className="gothic-title text-xl text-gray-300">O resultado aparecerá aqui</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#f0e9df] border-2 border-black p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4">
          <h3 className="text-2xl gothic-title border-b border-black/20 pb-2">CONSELHO DO MESTRE</h3>
          <p className="serif-quote text-lg leading-relaxed">
            {loading ? "Aguardando a IA finalizar o desenho..." : resultImage ? "O posicionamento ficou excelente. A curvatura do músculo valoriza o estilo tradicional. Recomendo um tamanho levemente maior para melhor legibilidade." : "Envie as fotos acima para receber um conselho técnico sobre o posicionamento da sua tatuagem."}
          </p>
        </div>
        <button className="bg-[#1a1a1a] text-white px-8 py-4 gothic-title text-2xl shadow-[6px_6px_0px_rgba(197,160,89,1)] hover:translate-x-1 hover:translate-y-1 transition-transform">
          FALAR COM ARTISTA
        </button>
      </div>
    </motion.div>
  );
};

const CalculatorTab = () => {
  const [size, setSize] = useState(26);
  const [complexity, setComplexity] = useState<"simples" | "média" | "alta">("simples");
  const [isColored, setIsColored] = useState(false);
  const [location, setLocation] = useState<"fácil" | "difícil">("fácil");

  const budget = useMemo(() => {
    let base = 200 + (size * 12);
    const complexMult = { simples: 1, média: 1.5, alta: 2.2 }[complexity];
    base *= complexMult;
    if (isColored) base *= 1.35;
    if (location === "difícil") base *= 1.25;
    
    const min = Math.floor(base * 0.9);
    const max = Math.ceil(base * 1.1);
    return { min, max };
  }, [size, complexity, isColored, location]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto p-6 space-y-12"
    >
      <div className="text-center space-y-2">
        <h2 className="text-6xl gothic-title text-[#a31d1d]">CALCULADORA DE ORÇAMENTO</h2>
        <p className="serif-quote text-xl text-gray-600">Planeje sua próxima obra de arte com precisão.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-[#f0e9df] border-2 border-black p-8 space-y-8 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 text-[#a31d1d]">
            <Star className="fill-current w-5 h-5" />
            <h3 className="text-2xl gothic-title">Configurações da Tatuagem</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="gothic-title text-xl">Tamanho Estimado</label>
              <span className="font-bold text-xl">{size} cm</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="60" 
              value={size} 
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#a31d1d]"
            />
          </div>

          <div className="space-y-4">
            <label className="gothic-title text-xl">Complexidade do Desenho</label>
            <div className="grid grid-cols-3 border-2 border-black overflow-hidden">
              {(["simples", "média", "alta"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setComplexity(c)}
                  className={`py-3 gothic-title text-lg transition-colors ${
                    complexity === c ? "bg-[#1a1a1a] text-white" : "bg-white text-black hover:bg-gray-100"
                  } ${c !== "alta" ? "border-r-2 border-black" : ""}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border-2 border-black p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="gothic-title text-lg">Tatuagem Colorida?</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold leading-tight max-w-[200px]">
                Pigmentos coloridos aumentam o custo e tempo de sessão
              </p>
            </div>
            <button 
              onClick={() => setIsColored(!isColored)}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${isColored ? "bg-[#a31d1d]" : "bg-gray-300"}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${isColored ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="space-y-4">
            <label className="gothic-title text-xl">Local do Corpo</label>
            <div className="grid grid-cols-2 border-2 border-black overflow-hidden">
              <button
                onClick={() => setLocation("fácil")}
                className={`py-3 gothic-title text-lg transition-colors ${
                  location === "fácil" ? "bg-[#1a1a1a] text-white" : "bg-white text-black hover:bg-gray-100"
                } border-r-2 border-black`}
              >
                Fácil (Braço/Perna)
              </button>
              <button
                onClick={() => setLocation("difícil")}
                className={`py-3 gothic-title text-lg transition-colors ${
                  location === "difícil" ? "bg-[#1a1a1a] text-white" : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Difícil (Costela/Pescoço)
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border-2 border-black p-10 text-center space-y-6 shadow-[12px_12px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#c5a059]" />
            <h3 className="text-[#c5a059] gothic-title text-3xl tracking-widest">ORÇAMENTO ESTIMADO</h3>
            <div className="text-7xl gothic-title tracking-tighter">
              R$ {budget.min} - {budget.max}
            </div>
            <p className="serif-quote text-gray-500">Este é um valor aproximado para referência.</p>
            
            <div className="text-left pt-6 border-t border-black/10 space-y-4">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em]">O QUE ESTÁ INCLUÍDO:</p>
              <ul className="space-y-2">
                {["Materiais descartáveis e esterilização", "Taxa mínima do estúdio", "Criação da arte personalizada"].map(item => (
                  <li key={item} className="flex items-center gap-2 font-semibold">
                    <div className="w-2 h-2 bg-[#a31d1d] rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-[#1a1a1a] text-white p-8 space-y-4 shadow-[8px_8px_0px_rgba(197,160,89,1)]">
            <h3 className="text-2xl gothic-title text-white border-b border-white/20 pb-2">AVISO IMPORTANTE</h3>
            <p className="serif-quote text-lg leading-relaxed text-gray-300">
              "O valor final depende da técnica de cada artista, do tempo de sessão e do detalhamento final da arte. Use este cálculo para se planejar, mas sempre confirme com o mestre tatuador."
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AftercareTab = () => {
  const steps = [
    {
      title: "Primeiras 2-4 Horas",
      icon: <ShieldCheck className="w-6 h-6 text-[#a31d1d]" />,
      desc: "Mantenha o curativo plástico. Ele protege contra bactérias e sujeira externa enquanto a pele está aberta.",
      tips: ["Não remova antes do tempo", "Evite tocar com mãos sujas"]
    },
    {
      title: "A Primeira Lavagem",
      icon: <Droplets className="w-6 h-6 text-[#a31d1d]" />,
      desc: "Lave com água morna e sabonete neutro. Use apenas as mãos, nunca esponjas.",
      tips: ["Seque apalpando com papel toalha", "Não esfregue"]
    },
    {
      title: "Hidratação (Dias 1-15)",
      icon: <Sparkles className="w-6 h-6 text-[#a31d1d]" />,
      desc: "Aplique uma camada muito fina de pomada específica 3x ao dia. A pele precisa respirar.",
      tips: ["Menos é mais", "Não deixe a pele encharcada"]
    },
    {
      title: "O Que Evitar",
      icon: <Sun className="w-6 h-6 text-[#a31d1d]" />,
      desc: "Sol, piscina, mar e sauna são proibidos por pelo menos 15-20 dias.",
      tips: ["Não puxe as casquinhas", "Evite alimentos gordurosos"]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto p-6 space-y-12"
    >
      <div className="text-center space-y-2">
        <h2 className="text-6xl gothic-title text-[#a31d1d]">GUIA DE CUIDADOS</h2>
        <p className="serif-quote text-xl text-gray-600">Sua tatuagem é uma ferida aberta. Trate-a com respeito.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step, i) => (
          <div key={i} className="bg-[#f0e9df] border-2 border-black p-6 space-y-4 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 border-b border-black/10 pb-3">
              {step.icon}
              <h3 className="text-2xl gothic-title">{step.title}</h3>
            </div>
            <p className="serif-quote text-lg leading-tight">{step.desc}</p>
            <div className="space-y-2">
              {step.tips.map(tip => (
                <div key={tip} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1a1a1a] text-white p-8 border-2 border-[#c5a059] space-y-6">
        <div className="flex items-center gap-3">
          <Wind className="w-8 h-8 text-[#c5a059]" />
          <h3 className="text-3xl gothic-title">SINAIS DE ALERTA</h3>
        </div>
        <p className="serif-quote text-lg text-gray-300">
          Se notar vermelhidão excessiva após 3 dias, pus, febre local ou dor latejante que não passa, procure seu tatuador ou um médico imediatamente. Infecções são raras mas devem ser tratadas rápido.
        </p>
        <div className="flex flex-wrap gap-4">
          <span className="border border-white/20 px-4 py-2 text-xs font-bold uppercase">Febre</span>
          <span className="border border-white/20 px-4 py-2 text-xs font-bold uppercase">Pus</span>
          <span className="border border-white/20 px-4 py-2 text-xs font-bold uppercase">Inchaço Extremo</span>
        </div>
      </div>
    </motion.div>
  );
};

const HealthTab = () => {
  const [answers, setAnswers] = useState<Record<number, boolean>>({});

  const questions = [
    {
      id: 1,
      question: "Você tem alergia a metais (níquel, cromo, etc.)?",
      details: "Muitas tintas contêm traços de metais. Alergias a bijuterias são um sinal de alerta.",
      severity: "alta"
    },
    {
      id: 2,
      question: "Já teve reações alérgicas a cosméticos ou tinturas de cabelo?",
      details: "Isso pode indicar sensibilidade a pigmentos específicos.",
      severity: "média"
    },
    {
      id: 3,
      question: "Você tem psoríase, eczema ou vitiligo na área a ser tatuada?",
      details: "Tatuar sobre áreas afetadas pode causar o fenômeno de Koebner (novas lesões).",
      severity: "alta"
    },
    {
      id: 4,
      question: "Tem tendência a desenvolver queloides ou cicatrizes hipertróficas?",
      details: "O processo de cicatrização da tatuagem pode desencadear queloides.",
      severity: "alta"
    },
    {
      id: 5,
      question: "Você faz uso de medicamentos anticoagulantes?",
      details: "Isso pode causar sangramento excessivo durante a sessão e prejudicar a fixação da tinta.",
      severity: "média"
    },
    {
      id: 6,
      question: "Pretende usar pigmento vermelho na sua tatuagem?",
      details: "O pigmento vermelho é o que mais causa reações alérgicas tardias.",
      severity: "baixa"
    }
  ];

  const toggleAnswer = (id: number) => {
    setAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const riskLevel = useMemo(() => {
    const activeAnswers = Object.values(answers).filter(Boolean).length;
    if (activeAnswers === 0) return { label: "Baixo", color: "text-green-600", bg: "bg-green-50" };
    if (activeAnswers <= 2) return { label: "Moderado", color: "text-yellow-600", bg: "bg-yellow-50" };
    return { label: "Alto", color: "text-red-600", bg: "bg-red-50" };
  }, [answers]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 space-y-12"
    >
      <div className="text-center space-y-2">
        <h2 className="text-6xl gothic-title text-[#a31d1d]">TESTE DE SENSIBILIDADE</h2>
        <p className="serif-quote text-xl text-gray-600">Sua saúde vem antes da arte. Responda com sinceridade.</p>
      </div>

      <div className={`p-6 border-2 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] ${riskLevel.bg} transition-colors duration-500`}>
        <div className="flex items-center justify-between mb-6 border-b border-black/10 pb-4">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-8 h-8" />
            <h3 className="text-2xl gothic-title">Nível de Risco Estimado: <span className={riskLevel.color}>{riskLevel.label}</span></h3>
          </div>
          <HeartPulse className={`w-8 h-8 ${riskLevel.color} animate-pulse`} />
        </div>

        <div className="space-y-4">
          {questions.map((q) => (
            <div 
              key={q.id}
              onClick={() => toggleAnswer(q.id)}
              className={`p-4 border-2 border-black cursor-pointer transition-all ${answers[q.id] ? 'bg-white translate-x-1 translate-y-1 shadow-none' : 'bg-[#f0e9df] shadow-[4px_4px_0px_rgba(0,0,0,1)]'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 w-6 h-6 border-2 border-black flex items-center justify-center ${answers[q.id] ? 'bg-[#a31d1d]' : 'bg-white'}`}>
                  {answers[q.id] && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg leading-tight">{q.question}</p>
                  <p className="text-xs text-gray-500 mt-1 italic">{q.details}</p>
                </div>
                <div className={`text-[10px] font-bold uppercase px-2 py-1 border border-black/20 ${q.severity === 'alta' ? 'text-red-600' : q.severity === 'média' ? 'text-yellow-600' : 'text-blue-600'}`}>
                  {q.severity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1a1a1a] text-white p-8 border-2 border-[#c5a059] space-y-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-[#c5a059]" />
          <h3 className="text-3xl gothic-title">RECOMENDAÇÃO DO ESPECIALISTA</h3>
        </div>
        <p className="serif-quote text-lg text-gray-300">
          {Object.values(answers).some(Boolean) 
            ? "Você marcou um ou mais pontos de atenção. É altamente recomendável realizar um teste de contato com o pigmento (especialmente se for colorido) 48 horas antes da sessão e consultar um dermatologista."
            : "Com base nas suas respostas, você parece ter um perfil seguro para tatuar. No entanto, lembre-se que reações alérgicas podem ocorrer mesmo sem histórico prévio."}
        </p>
        <div className="pt-4 border-t border-white/10">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Aviso Legal</p>
          <p className="text-xs italic text-gray-400">Este teste é apenas informativo e não substitui uma consulta médica profissional.</p>
        </div>
      </div>
    </motion.div>
  );
};

const Footer = () => (
  <footer className="mt-24 border-t-2 border-black pt-12 pb-8 px-6 text-center space-y-8">
    <div className="flex justify-center gap-8">
      <div className="w-32 h-32 border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <img src="https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?q=80&w=400&auto=format&fit=crop" alt="Tattoo Reference 1" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <div className="flex flex-col justify-center">
        <h2 className="text-4xl gothic-title tracking-tighter">TATTOO FINDER</h2>
      </div>
      <div className="w-32 h-32 border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <img src="https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?q=80&w=400&auto=format&fit=crop" alt="Tattoo Reference 2" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    </div>
    <p className="text-[10px] uppercase font-bold tracking-[0.5em] text-gray-500">
      TRADIÇÃO & INTELIGÊNCIA ARTIFICIAL • 2026
    </p>
  </footer>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("inspiração");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  return (
    <div className="min-h-screen selection:bg-[#a31d1d] selection:text-white relative">
      {/* Background Image Layer */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?q=80&w=1920&auto=format&fit=crop" 
          alt="Background Texture" 
          className="w-full h-full object-cover opacity-[0.04] grayscale contrast-125"
          referrerPolicy="no-referrer"
        />
      </div>

      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="container mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === "inspiração" && (
            <InspirationTab 
              onTattooAnalyzed={(img) => setReferenceImage(img)} 
            />
          )}
          {activeTab === "simulação" && (
            <SimulationTab 
              referenceImage={referenceImage} 
            />
          )}
          {activeTab === "calculadora" && <CalculatorTab key="calculadora" />}
          {activeTab === "cuidados" && <AftercareTab key="cuidados" />}
          {activeTab === "saúde" && <HealthTab key="saúde" />}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
