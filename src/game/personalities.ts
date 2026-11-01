export type PersonalityId = 'cat' | 'robot' | 'dragon';
export type AvatarMood = 'normal' | 'evil' | 'happy';
export type VocalEmotionCue = 'laugh' | 'yawn' | 'gasp' | 'sigh' | 'hype' | 'calm';

export interface AIPersonality {
  id: PersonalityId;
  name: string;
  humanCoachName: string;
  badge: string;
  skillLevel: 1 | 10 | 20;
  tagline: string;
  defaultStatus: string;
  voicePitch: number;
  voiceRate: number;
  openingGreeting: string;
  roastsOnBlunder: string[];
  praiseOnGoodMove: string[];
  normalLines: string[];
  checkLines: string[];
  playerWinLines: string[];
  aiWinLines: string[];
  chaiBanterLines: string[];
  hypeLines: string[];
}

export interface MateInOnePuzzle {
  id: string;
  title: string;
  subtitle: string;
  fen: string;
  solutionFrom: string;
  solutionTo: string;
  solutionSan: string;
  hint: string;
}

export const AI_PERSONALITIES: Record<PersonalityId, AIPersonality> = {
  cat: {
    id: 'cat',
    name: 'Noob Cat',
    humanCoachName: 'Mimi · Chill Hostel Buddy',
    badge: 'Skill 1 · Playful & Cozy',
    skillLevel: 1,
    tagline: 'Warm, sleepy hostel friend who plays casual chess over hot Maggi and milk.',
    defaultStatus: 'Stretching lazily & watching the board with sleepy eyes...',
    // Natural human-range pitch & warm conversational cadence (not squeaky robot)
    voicePitch: 1.07,
    voiceRate: 0.97,
    openingGreeting:
      'Hey yaar, namaste! Main Mimi the Noob Cat hoon... Sach bataun toh mujhe abhi thodi neend aa rahi hai, par chalo aaram se dosti wala match khelte hain!',
    roastsOnBlunder: [
      'Oye hoye! Arre yaar, yeh piece toh aapne bilkul free mein de diya! Haha, aaj toh meri party pakki hai!',
      'Arre bhaiya, kya soch ke chala yeh move? Main toh aadhi neend mein tha, phir bhi mujhe dikh gaya!',
      'Haha, sach batao, mera dil rakhne ke liye jaan-boojh ke piece gift kar rahe ho na? Kitne sweet ho yaar!',
    ],
    praiseOnGoodMove: [
      'Arre waah yaar! Kya baat hai... itna sharp move dekh ke meri saari neend ud gayi!',
      'Oho! Vishy Anand wali feeling aa rahi hai aapse aaj... thoda raham karo apne chhote dost pe!',
      'Kamaal kar diya boss! Dil jeet liya aapke is move ne, ab mujhe sach mein sochna padega.',
    ],
    normalLines: [
      'Hmm... ruko zara sochne do. Yeh ghoda dhai kadam chal ke kahan jayega... chalo yahan rakh dete hain!',
      'Yaar aap bade dhyan se khel rahe ho... main bas apna cute sa pawn aage badha deta hoon, dekhte hain kya hota hai.',
      'Aap aaram se socho, koi jaldi nahi hai... tab tak main thoda angdai le leta hoon.',
    ],
    checkLines: [
      'Oye, sorry yaar, par Check lag gaya! Apne Raja ji ko thoda safe jagah le jao please!',
      'Surprise! Dekha, baaton-baaton mein maine Check de diya! Ab bach ke dikhao!',
    ],
    playerWinLines: [
      'Arre, main toh so raha tha, aapne jeet liya! Haha, mazaa aa gaya yaar, 5-Star Jeeto champion!',
    ],
    aiWinLines: [
      'Hehe! Sote-sote tukke se checkmate lag gaya yaar! Koi baat nahi, ek aur friendly match khelein?',
    ],
    chaiBanterLines: [
      'Yaar ek cup garma-garam adrak wali chai mil jaati na, toh main bhi Grandmaster jaisa sochta!',
      'STEM exhibition mein kitni bheed hai na aaj! Aapke saath khel ke bada mazaa aa raha hai dost.',
    ],
    hypeLines: [
      'Aapka game sense sach mein bohot solid hai yaar! Bas thoda center pe bharosa rakho, aap zaroor jeetoge!',
    ],
  },
  robot: {
    id: 'robot',
    name: 'Sarcastic Robot',
    humanCoachName: 'Kabir · Witty Club Senior',
    badge: 'Skill 10 · Desi Banter',
    skillLevel: 10,
    tagline: 'Your witty college chess club senior who roasts like a best friend over cutting chai.',
    defaultStatus: 'Sipping cutting chai & smirking at your opening setup...',
    // Natural expressive conversational baritone
    voicePitch: 1.0,
    voiceRate: 1.0,
    openingGreeting:
      'Aur bhai, kya haal chaal! Main Kabir, aapka Sarcastic Coach hoon. Aaj dekhte hain aapki gulli-chess chalti hai ya mera solid calculation!',
    roastsOnBlunder: [
      'Stockfish bol raha hai thank you for the free win! Arre bhai, itna bada blunder kaise maar diya yaar?',
      'Arre nahi yaar, phir try karo! Yeh move dekh kar toh meri chai girte-girte bachi!',
      'Bhai, chess khelna aata hai? STEM Exhibition mein Diwali sale laga rakhi hai kya?',
    ],
    praiseOnGoodMove: [
      'Wah! Kya baat hai, acha move tha! Evaluation bar ekdum hila diya aapne!',
      'Not bad, human. Yeh move dekh ke toh mujhe bhi thoda paseena aa gaya, solid calculation!',
      'Ekdum kadak move maara hai yaar! Ab match mein asli garma-garmi aayegi!',
    ],
    normalLines: [
      'Dekho dost, aapka plan toh accha lag raha hai... par maine bhi ek chhota sa jaal bichhaya hai, dhyan se aana!',
      'Hmm, interesting position ban rahi hai yaar. Chalo yeh move chal ke dekhte hain aap kya jawab dete ho.',
      'Mera gut feeling keh raha hai ki agle do moves mein kuch bada dhamaka hone wala hai board pe!',
    ],
    checkLines: [
      'Aur yeh raha Check! Bhai sahab, apne King ko bachao warna khel yahin samapt ho jayega!',
      'Seedha Raja pe nishana! Check hai boss, soch-samajh ke kadam uthana ab!',
    ],
    playerWinLines: [
      'Arre baap re! Maan gaye guru, aaj toh aapne meri bolti band kar di! Dil se salute, 5-Star Champion!',
    ],
    aiWinLines: [
      'Stockfish bol raha hai thank you for the free win! Haha, dil chhota mat karo yaar, agla match aapka hoga!',
    ],
    chaiBanterLines: [
      'Bhai, chess aur cutting chai ka rishta hi alag hai... ek chuski lagao aur agla move dhoondo!',
      'Dekho yaar, roast toh main dosti mein karta hoon, warna khel toh aap kaafibadhiya rahe ho!',
    ],
    hypeLines: [
      'Sun dost, haar-jeet toh chalti rehti hai, par jis confidence se aap attack kar rahe ho na—maza aa gaya dekh ke!',
    ],
  },
  dragon: {
    id: 'dragon',
    name: 'Grandmaster Dragon',
    humanCoachName: 'GM Devraj · Master Mentor',
    badge: 'Skill 20 · Grandmaster',
    skillLevel: 20,
    tagline: 'Seasoned classical Grandmaster mentor—calm, deeply human, insightful, and razor-sharp.',
    defaultStatus: 'Hands folded, studying the deep geometry of the 64 squares...',
    // Warm, calm, resonant human mentor voice (not artificially deep/robotic)
    voicePitch: 0.94,
    voiceRate: 0.98,
    openingGreeting:
      'Welcome to the board, my friend. Take a deep breath... chess is a conversation between two minds. Show me your opening idea.',
    roastsOnBlunder: [
      'Your position is hopeless. That inaccuracy surrenders critical central control.',
      'Pathetic move. Surrender now—or find an active defense immediately.',
      'You offered material without sufficient compensation. Punished immediately.',
    ],
    praiseOnGoodMove: [
      'Wah! Kya baat hai, acha move tha! You found the most harmonious square.',
      'Not bad, human. That was a true Grandmaster resource—calm and precise.',
    ],
    normalLines: [
      'Look at the dark squares closely... every piece wants a purposeful home.',
      'Breathe and observe the whole board. Where is your least active piece right now?',
      'A quiet move often speaks louder than a desperate attack. Your turn to respond.',
    ],
    checkLines: [
      'Check. Keep your composure—look for the safest shelter for your King.',
      'Direct pressure on the monarch. Respond with precision, not panic.',
    ],
    playerWinLines: [
      'Extraordinary, my friend. You played with clarity, courage, and true Grandmaster heart. Take a bow.',
    ],
    aiWinLines: [
      'Checkmate. Every loss is simply the tuition we pay for mastery—let us play again and grow stronger.',
    ],
    chaiBanterLines: [
      'Even in classic tournament halls in Chennai and Moscow, a warm cup of tea and a calm mind win more games than raw memorization.',
      'Do not fear the rating or the title across the table. Play the board, trust your intuition, and enjoy the art.',
    ],
    hypeLines: [
      'You have genuine tactical vision. Slow down by just two seconds before each move, and nobody in this hall will stop you.',
    ],
  },
};

export const MATE_IN_ONE_PUZZLES: MateInOnePuzzle[] = [
  {
    id: 'scholars-finale',
    title: "Scholar's Strike",
    subtitle: 'White to move · Mate in 1 on f7',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solutionFrom: 'h5',
    solutionTo: 'f7',
    solutionSan: 'Qxf7#',
    hint: 'Target the weakest square next to the Black King with your Queen supported by the Bishop on c4!',
  },
  {
    id: 'back-rank-thunder',
    title: 'Back-Rank Thunder',
    subtitle: 'White to move · Corridor Checkmate in 1',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solutionFrom: 'd1',
    solutionTo: 'd8',
    solutionSan: 'Rd8#',
    hint: 'Black’s own pawns trap the King on the 8th rank. Send the Rook all the way up!',
  },
  {
    id: 'smothered-knight',
    title: "Philidor's Smothered Mate",
    subtitle: 'White to move · Royal Knight Leap in 1',
    fen: '6rk/6pp/7N/8/8/8/8/6K1 w - - 0 1',
    solutionFrom: 'h6',
    solutionTo: 'f7',
    solutionSan: 'Nf7#',
    hint: 'Only a Knight can jump over boxed-in pieces to deliver a smothered checkmate!',
  },
  {
    id: 'arabian-corner',
    title: 'Arabian Corner Mate',
    subtitle: 'White to move · Rook + Knight Synergy in 1',
    fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1',
    solutionFrom: 'a7',
    solutionTo: 'h7',
    solutionSan: 'Rh7#',
    hint: 'The Knight on f6 guards g8 and supports h7. Deliver the final blow with the Rook!',
  },
  {
    id: 'epaulette-crown',
    title: "Queen's Kiss Mate",
    subtitle: 'White to move · Close-Range Checkmate in 1',
    fen: '6k1/5p1p/5P1Q/8/8/8/6PP/6K1 w - - 0 1',
    solutionFrom: 'h6',
    solutionTo: 'g7',
    solutionSan: 'Qg7#',
    hint: 'Plant the Queen on g7 directly in front of the King, diagonally protected by your Pawn on f6!',
  },
  {
    id: 'opera-finale',
    title: 'Opera House Finale',
    subtitle: 'White to move · Morphy Rook Mate in 1',
    fen: '1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w k - 0 17',
    solutionFrom: 'd1',
    solutionTo: 'd8',
    solutionSan: 'Rd8#',
    hint: 'The Bishop on g5 guards d8 and traps the Black King in the center!',
  },
];

export interface EvaluatedCommentary {
  text: string;
  mood: AvatarMood;
  emotionLabel: string;
  stageDirection: string;
  vocalCue: VocalEmotionCue;
}

export function evaluateCommentaryAndMood(params: {
  personalityId: PersonalityId;
  evalBefore: number;
  evalAfter: number;
  isPlayerCheckmate: boolean;
  isAICheckmate: boolean;
  aiGaveCheck: boolean;
}): EvaluatedCommentary {
  const persona = AI_PERSONALITIES[params.personalityId];
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  if (params.isPlayerCheckmate) {
    return {
      text: pick(persona.playerWinLines),
      mood: 'happy',
      emotionLabel: '🎉 Proud & Amazed',
      stageDirection:
        params.personalityId === 'cat'
          ? '*claps paws & purrs loudly*'
          : params.personalityId === 'robot'
            ? '*stands up & applauds warmly*'
            : '*bows head in quiet Grandmaster respect*',
      vocalCue: 'hype',
    };
  }

  if (params.isAICheckmate) {
    return {
      text: pick(persona.aiWinLines),
      mood: 'evil',
      emotionLabel: '😏 Victorious Grin',
      stageDirection:
        params.personalityId === 'cat'
          ? '*winks & curls tail happily*'
          : params.personalityId === 'robot'
            ? '*grins & taps the King gently*'
            : '*folds hands calmly across the table*',
      vocalCue: 'laugh',
    };
  }

  const evalDeltaForPlayer = params.evalAfter - params.evalBefore;

  if (params.aiGaveCheck) {
    return {
      text: pick(persona.checkLines),
      mood: 'evil',
      emotionLabel: '⚡ Sharp Alert',
      stageDirection: '*leans forward & points at your King*',
      vocalCue: 'gasp',
    };
  }

  // Player dropped >= 0.9 pawns of evaluation -> Playful human roast!
  if (evalDeltaForPlayer <= -0.9) {
    return {
      text: pick(persona.roastsOnBlunder),
      mood: 'evil',
      emotionLabel:
        params.personalityId === 'dragon'
          ? '🧐 Mentor Correction'
          : '😂 Playful Roast',
      stageDirection:
        params.personalityId === 'cat'
          ? '*giggles behind paws*'
          : params.personalityId === 'robot'
            ? '*chuckles & nearly spills cutting chai*'
            : '*raises an eyebrow & shakes head gently*',
      vocalCue: params.personalityId === 'dragon' ? 'sigh' : 'laugh',
    };
  }

  // Player gained >= 0.75 pawns -> Genuinely impressed!
  if (evalDeltaForPlayer >= 0.75) {
    return {
      text: pick(persona.praiseOnGoodMove),
      mood: 'happy',
      emotionLabel: '🤩 Genuinely Impressed',
      stageDirection:
        params.personalityId === 'cat'
          ? '*ears perk up wide awake*'
          : params.personalityId === 'robot'
            ? '*nods with a big appreciative smile*'
            : '*smiles warmly with an approving nod*',
      vocalCue: 'hype',
    };
  }

  return {
    text: pick(persona.normalLines),
    mood: 'normal',
    emotionLabel:
      params.personalityId === 'cat'
        ? '🥱 Cozy & Chill'
        : params.personalityId === 'robot'
          ? '☕ Friendly Banter'
          : '🧘 Calm Focus',
    stageDirection:
      params.personalityId === 'cat'
        ? '*stretches lazily & yawns*'
        : params.personalityId === 'robot'
          ? '*takes a relaxed sip of chai*'
          : '*studies the board with quiet warmth*',
    vocalCue: params.personalityId === 'cat' ? 'yawn' : 'calm',
  };
}

export function getHumanBanterResponse(
  personalityId: PersonalityId,
  topic: 'chai' | 'roast' | 'hype'
): EvaluatedCommentary {
  const persona = AI_PERSONALITIES[personalityId];
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  if (topic === 'roast') {
    return {
      text: pick(persona.roastsOnBlunder),
      mood: 'evil',
      emotionLabel: '🔥 Friendly Roast',
      stageDirection:
        personalityId === 'robot'
          ? '*laughs out loud & flashes red visor*'
          : '*grins playfully across the board*',
      vocalCue: 'laugh',
    };
  }

  if (topic === 'hype') {
    return {
      text: pick(persona.hypeLines),
      mood: 'happy',
      emotionLabel: '🤗 Encouraging Buddy',
      stageDirection: '*gives you an encouraging fist-bump*',
      vocalCue: 'hype',
    };
  }

  return {
    text: pick(persona.chaiBanterLines),
    mood: 'normal',
    emotionLabel: '☕ Chai Pe Charcha',
    stageDirection: '*relaxes shoulders & chats like an old friend*',
    vocalCue: 'calm',
  };
}
