"use server";

import { GeneralChat } from "@chaingpt/generalchat";
import { SmartContractAuditor } from "@chaingpt/smartcontractauditor";
import { logEvent } from "@/lib/server-log";

const NOX_CONTEXT = {
  companyName: "Nox RWA Shield",
  companyDescription:
    "A confidential DeFi application built on iExec Nox Protocol (ERC-7984 confidential tokens) on Arbitrum Sepolia. Users wrap real-world asset ERC-20 tokens into confidential wrappers — balances are encrypted on-chain and decryptable only by authorized wallets via iExec TEE. Supports shield, confidential transfer, and TEE-based balance reveal.",
  purpose:
    "Act as an RWA Compliance Advisor. Help users understand compliance, privacy regulations (MiCA, GDPR, AML/KYC), and the implications of holding tokenized real-world assets with confidential balances on a public blockchain.",
  companyWebsiteUrl: "https://github.com/nordost8/nox-assassin",
};

const DEMO_ASSET_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
contract DemoAsset is ERC20, Ownable {
    mapping(address minter => bool) public isMinter;
    constructor(address initialOwner, string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(initialOwner) {}
    function decimals() public pure override returns (uint8) { return 18; }
    function setMinter(address minter, bool allowed) external onlyOwner { isMinter[minter] = allowed; }
    function mint(address to, uint256 amount) external {
        require(msg.sender == owner() || isMinter[msg.sender], "DemoAsset: not minter");
        _mint(to, amount);
    }
}`;

const CONFIDENTIAL_WRAPPER_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";
contract ConfidentialDemoAsset is ERC20ToERC7984Wrapper {
    constructor(IERC20 underlying_, string memory name_, string memory symbol_)
        ERC7984(name_, symbol_, "")
        ERC20ToERC7984Wrapper(underlying_)
    {}
}`;

function getClient(): GeneralChat {
  const apiKey = process.env.CHAINGPT_API_KEY;
  if (!apiKey) throw new Error("CHAINGPT_API_KEY not configured");
  return new GeneralChat({ apiKey });
}

function getAuditor(): SmartContractAuditor {
  const apiKey = process.env.CHAINGPT_API_KEY;
  if (!apiKey) throw new Error("CHAINGPT_API_KEY not configured");
  return new SmartContractAuditor({ apiKey });
}

export type AiResult = { ok: true; answer: string } | { ok: false; error: string };

export type AuditSeverity = "Critical" | "High" | "Medium" | "Low";
export type AuditFinding = { severity: AuditSeverity; title: string; detail: string };
export type AuditReport = {
  findings: AuditFinding[];
  overall: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
};
export type AuditResult = { ok: true; report: AuditReport } | { ok: false; error: string };

async function structureAuditReport(rawText: string): Promise<AuditReport> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    logEvent({ kind: "deepseek-error", error: "DEEPSEEK_API_KEY not configured" }, "error");
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            'You are a JSON extractor. Given a smart contract audit report, extract findings and return ONLY valid JSON — no markdown, no extra text.',
        },
        {
          role: "user",
          content: `Extract audit findings from the report below. Return ONLY this JSON structure:\n{"findings":[{"severity":"Critical|High|Medium|Low","title":"short title","detail":"one or two sentence explanation"}],"overall":"LOW|MEDIUM|HIGH|CRITICAL","summary":"one sentence overall assessment"}\n\nReport:\n${rawText}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    logEvent({ kind: "deepseek-error", status: res.status }, "error");
    throw new Error(`Structuring service error: ${res.status}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  // Strip potential markdown code fences
  const cleaned = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(cleaned) as AuditReport;
}

export async function askAdvisor(portfolioContext: string, question: string): Promise<AiResult> {
  try {
    const client = getClient();
    const fullQuestion = portfolioContext
      ? `${question}\n\n---\nMy current portfolio on Nox RWA Shield:\n${portfolioContext}`
      : question;
    const response = await client.createChatBlob({
      question: fullQuestion,
      chatHistory: "off",
      useCustomContext: true,
      contextInjection: NOX_CONTEXT,
    });
    const answer = (response?.data?.bot as string | undefined) ?? "";
    if (!answer) return { ok: false, error: "Empty response from ChainGPT" };
    return { ok: true, answer };
  } catch (e) {
    logEvent({ kind: "chaingpt-error", fn: "askAdvisor", error: e instanceof Error ? e.message : String(e) }, "error");
    return { ok: false, error: e instanceof Error ? e.message : "AI request failed" };
  }
}

export async function getAiNews(): Promise<AiResult> {
  try {
    const client = getClient();
    const response = await client.createChatBlob({
      question:
        'Give me 4 recent developments in RWA tokenization, DeFi privacy, and confidential blockchain technology. Respond ONLY with a valid JSON array, no markdown, no explanation: [{"title":"...","summary":"...","category":"RWA|Privacy|DeFi|Regulation"}]. Summaries max 70 words.',
      chatHistory: "off",
    });
    const answer = (response?.data?.bot as string | undefined) ?? "";
    if (!answer) return { ok: false, error: "Empty response" };
    return { ok: true, answer };
  } catch (e) {
    logEvent({ kind: "chaingpt-error", fn: "getAiNews", error: e instanceof Error ? e.message : String(e) }, "error");
    return { ok: false, error: e instanceof Error ? e.message : "News fetch failed" };
  }
}

export async function analyzeContract(
  tokenName: string,
  tokenSymbol: string,
  underlyingAddress: string,
  wrapperAddress: string,
): Promise<AuditResult> {
  try {
    const auditor = getAuditor();
    const question = `Audit the following Solidity smart contracts deployed on Arbitrum Sepolia as part of the Nox RWA Shield protocol.

Token: ${tokenName} (${tokenSymbol})
Underlying ERC-20 address: ${underlyingAddress}
Confidential ERC-7984 wrapper address: ${wrapperAddress}

--- Contract 1: Underlying ERC-20 Token ---
${DEMO_ASSET_SOL}

--- Contract 2: Confidential ERC-7984 Wrapper ---
${CONFIDENTIAL_WRAPPER_SOL}

Provide a structured security report:
1. Vulnerability findings (critical / high / medium / low)
2. Access control analysis
3. ERC-7984 wrapper safety
4. Minting & supply control risks
5. Overall risk rating: LOW / MEDIUM / HIGH`;

    const response = await auditor.auditSmartContractBlob({
      question,
      chatHistory: "off",
    });
    const rawText = (response?.data?.bot as string | undefined) ?? "";
    if (!rawText) return { ok: false, error: "Empty audit response from ChainGPT" };

    const report = await structureAuditReport(rawText);
    return { ok: true, report };
  } catch (e) {
    logEvent({ kind: "chaingpt-error", fn: "analyzeContract", error: e instanceof Error ? e.message : String(e) }, "error");
    return { ok: false, error: e instanceof Error ? e.message : "Audit failed" };
  }
}
