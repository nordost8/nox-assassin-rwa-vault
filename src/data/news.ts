export interface NewsItem {
  tag: string;
  title: string;
  source: string;
  time: string;
  body: string;
}

export const NEWS: NewsItem[] = [
  { tag: "RWA", title: "BlackRock's BUIDL crosses $2.5B in tokenized treasuries", source: "ChainGPT News", time: "2h", body: "On-chain treasury exposure continues to compound, with privacy-preserving wrappers gaining institutional traction." },
  { tag: "Privacy", title: "iExec Nox introduces ERC-7984 reference implementation", source: "iExec Blog", time: "6h", body: "Confidential ERC-20 standard ships with TEE-backed reveal pattern; Arbitrum Sepolia testnet live." },
  { tag: "Regulation", title: "MiCA clarifies treatment of confidential tokens in EU", source: "Reuters", time: "1d", body: "ESMA guidance accepts shielded balances provided issuer maintains attestable cap-table." },
  { tag: "Markets", title: "Tokenized gold flows surge after CPI print", source: "Bloomberg", time: "1d", body: "dGOLD-style instruments saw 4.1% net inflow week-over-week, driven by family-office demand." },
];
