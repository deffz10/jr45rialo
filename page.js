"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

const RLO_ADDRESS = "0x46Ad6B16338ea9188B9ae17f4D3dE454E96580cd";
const GAME_ADDRESS = "0xE8788C2a929Cb5Ffc3a2DE646868e1BD868a5194";

const RLO_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function buy() payable",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const GAME_ABI = [
  "function flip(bool guess, uint256 amount)",
  "event Result(address player, bool win, uint amount)"
];

export default function Home() {

  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState("");
  const [side, setSide] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  // AUTO CONNECT
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" })
        .then(accounts => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            loadBalance(accounts[0]);
          }
        });
    }
  }, []);

  async function connectWallet() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
    loadBalance(accounts[0]);
  }

  async function loadBalance(user) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(RLO_ADDRESS, RLO_ABI, provider);
    const bal = await contract.balanceOf(user);
    setBalance(Number(ethers.formatEther(bal)));
  }

  // BUY RLO FAST REFRESH
  async function buyRLO(valueEth) {
    if (!account) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const rlo = new ethers.Contract(RLO_ADDRESS, RLO_ABI, signer);

      const tx = await rlo.buy({
        value: ethers.parseEther(valueEth)
      });

      // Optimistic UI
      const estimatedAdd =
        valueEth === "0.0000001" ? 1000 :
        valueEth === "0.000001" ? 5000 :
        10000;

      setBalance(prev => prev + estimatedAdd);

      await tx.wait();
      loadBalance(account);

    } catch (err) {
      console.log(err);
    }
  }

  // REAL FLIP WITH 4 SECOND ANIMATION
  async function flipCoin() {
    if (!bet || Number(bet) <= 0) return;

    setIsFlipping(true);
    setResult(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const rlo = new ethers.Contract(RLO_ADDRESS, RLO_ABI, signer);
      const game = new ethers.Contract(GAME_ADDRESS, GAME_ABI, signer);

      const amount = ethers.parseEther(bet);
      const allowance = await rlo.allowance(account, GAME_ADDRESS);

      if (allowance < amount) {
        const approveTx = await rlo.approve(GAME_ADDRESS, amount);
        await approveTx.wait();
      }

      const tx = await game.flip(side, amount);
      const receipt = await tx.wait();

      const iface = new ethers.Interface(GAME_ABI);
      let win = false;

      receipt.logs.forEach((log) => {
        try {
          const parsed = iface.parseLog(log);
          if (parsed.name === "Result") {
            win = parsed.args.win;
          }
        } catch {}
      });

      // 4 DETIK ANIMASI
      setTimeout(() => {
        setIsFlipping(false);

        if (win) {
          setWins(prev => prev + 1);
          setResult("WIN");
        } else {
          setLosses(prev => prev + 1);
          setResult("LOSE");
        }

        loadBalance(account);

      }, 4000);

    } catch (err) {
      console.log(err);
      setIsFlipping(false);
    }
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden">

      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0b1120] to-black"></div>
      <div className="relative z-10 flex min-h-screen">

        <div className="flex-1 flex flex-col items-center justify-center">

          <div className="text-gray-400 mb-6">Ready to play</div>

          <div className={`relative w-72 h-72 ${isFlipping ? "animate-spin" : ""}`}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 shadow-[0_0_80px_gold] flex items-center justify-center text-[140px] font-bold">
              {side ? "♠" : "♥"}
            </div>
          </div>

          {result && (
            <div className={`mt-8 text-4xl font-bold ${
              result === "WIN" ? "text-green-400" : "text-red-400"
            }`}>
              {result === "WIN" ? "YOU WIN 🎉" : "YOU LOSE 💀"}
            </div>
          )}

          <div className="flex gap-8 mt-12 text-center">
            <div className="bg-green-900/40 px-8 py-4 rounded-xl">
              <div className="text-green-400 text-sm">WINS</div>
              <div className="text-2xl font-bold">{wins}</div>
            </div>
            <div className="bg-red-900/40 px-8 py-4 rounded-xl">
              <div className="text-red-400 text-sm">LOSSES</div>
              <div className="text-2xl font-bold">{losses}</div>
            </div>
          </div>

        </div>

        <div className="w-[420px] bg-[#0f172a] border-l border-gray-800 p-8">

          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-bold">RLO Casino</h2>
            <button
              onClick={connectWallet}
              className="bg-cyan-600 px-4 py-2 rounded-lg text-sm"
            >
              {account ? "Connected" : "Connect"}
            </button>
          </div>

          <div className="mb-6">
            <div className="text-sm mb-2 text-gray-400">Buy RLO</div>
            <div className="flex gap-2">
              <button onClick={() => buyRLO("0.0000001")} className="bg-blue-600 px-3 py-2 rounded-lg text-xs">1000</button>
              <button onClick={() => buyRLO("0.000001")} className="bg-blue-600 px-3 py-2 rounded-lg text-xs">5000</button>
              <button onClick={() => buyRLO("0.00001")} className="bg-blue-600 px-3 py-2 rounded-lg text-xs">10000</button>
            </div>
          </div>

          {account && (
            <div className="mb-6 text-gray-400">
              Balance: {balance.toFixed(2)} RLO
            </div>
          )}

          <input
            type="number"
            placeholder="Enter amount..."
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            className="w-full p-3 mb-4 bg-gray-800 rounded-xl"
          />

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setSide(true)}
              className={`flex-1 p-3 rounded-xl ${
                side ? "bg-cyan-600" : "bg-gray-700"
              }`}
            >
              Heads
            </button>
            <button
              onClick={() => setSide(false)}
              className={`flex-1 p-3 rounded-xl ${
                !side ? "bg-cyan-600" : "bg-gray-700"
              }`}
            >
              Tails
            </button>
          </div>

          <button
            onClick={flipCoin}
            disabled={isFlipping}
            className="w-full bg-cyan-600 p-3 rounded-xl disabled:opacity-50"
          >
            {isFlipping ? "Flipping..." : "Flip Coin"}
          </button>

        </div>
      </div>
    </div>
  );
}
