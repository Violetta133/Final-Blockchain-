// ====== CONFIG: REWARD TOKEN (ERC-20) ======
const REWARD_TOKEN_ADDRESS = "0xb6EFcC801e6Ca68f01215193Ce26EF0a2C1b225B";
const REWARD_TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

let rewardToken;
let rewardDecimals = 18;
let rewardSymbol = "ART";

// ====== CONFIG: MARKET ======
const MARKET_ADDRESS = "0x92F45B1F876FdB14702a04D2FC1da81988cCeC51";

// ✅ clean addresses (removes accidental spaces)
const MARKET_ADDRESS_CLEAN = MARKET_ADDRESS.trim();
const REWARD_TOKEN_ADDRESS_CLEAN = REWARD_TOKEN_ADDRESS.trim();

const MARKET_ABI = [
  "function artCount() view returns (uint256)",
  "function getArt(uint256) view returns (string title,string imageURL,uint256 price,address seller,address buyer,bool sold)",
  "function listingFee() view returns (uint256)",
  "function listArt(string title,string imageURL,uint256 priceWei) payable",
  "function buyArt(uint256 id) payable",
  "event ArtListed(uint256 indexed id,address indexed seller,uint256 price,string title)",
  "event ArtBought(uint256 indexed id,address indexed buyer,address indexed seller,uint256 price)"
];

let provider;
let signer;
let market;
let userAddress;

let ID_START = null; // auto-detect 0 or 1

// ====== INIT ======
window.addEventListener("load", async () => {
  setupTabs();
  setupMintForm();
  setupConnect();

  renderMessage("Connect MetaMask (Sepolia), then click Connect", "success");

  // try auto-connect if already authorized
  try {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts?.length) await connectWallet(false);
    }
  } catch {}

  await loadMarketplace();
});

// ====== CONNECT ======
function setupConnect() {
  const btn = document.getElementById("connectBtn");
  btn.addEventListener("click", () => connectWallet(true));

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  } else {
    btn.disabled = true;
    renderMessage("MetaMask is not installed. Please install the extension.", "error");
  }
}

async function connectWallet(requestAccess = true) {
  try {
    if (!window.ethereum) throw new Error("MetaMask not found");

    const accounts = requestAccess
      ? await window.ethereum.request({ method: "eth_requestAccounts" })
      : await window.ethereum.request({ method: "eth_accounts" });

    if (!accounts?.length) {
      renderMessage("Please connect MetaMask", "error");
      return;
    }

    userAddress = accounts[0];

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();

    // ✅ use CLEAN addresses
    market = new ethers.Contract(MARKET_ADDRESS_CLEAN, MARKET_ABI, signer);

    // ✅ init reward token (read-only)
    rewardToken = null;
    if (REWARD_TOKEN_ADDRESS_CLEAN && REWARD_TOKEN_ADDRESS_CLEAN !== "0x...") {
      try {
        rewardToken = new ethers.Contract(REWARD_TOKEN_ADDRESS_CLEAN, REWARD_TOKEN_ABI, provider);
        rewardDecimals = await rewardToken.decimals();
        rewardSymbol = await rewardToken.symbol();
      } catch (e) {
        console.warn("Reward token init failed:", e);
        rewardToken = null;
      }
    } else {
      console.warn("REWARD_TOKEN_ADDRESS is not set");
    }

    const net = await provider.getNetwork();
    const bal = await provider.getBalance(userAddress);

    // UI
    const connectBtn = document.getElementById("connectBtn");
    const walletInfo = document.getElementById("walletInfo");
    if (connectBtn) connectBtn.style.display = "none";
    if (walletInfo) walletInfo.style.display = "block";

    const addrEl = document.getElementById("walletAddress");
    const netEl = document.getElementById("networkInfo");
    const balEl = document.getElementById("balanceInfo");

    if (addrEl) addrEl.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    if (netEl) netEl.textContent = `Network: ${networkName(net.chainId)}`;
    if (balEl) balEl.textContent = `Balance: ${trimEth(ethers.formatEther(bal))} ETH`;

    renderMessage("Wallet connected ✅", "success");

    ID_START = null;

    await loadMarketplace();
    await loadMyCollection();
    await loadStats();
  } catch (e) {
    renderMessage(`Connection error: ${e.message}`, "error");
    console.error(e);
  }
}

async function ensureConnected() {
  if (!market || !userAddress) {
    renderMessage("Please connect MetaMask first", "error");
    return false;
  }
  return true;
}

function networkName(chainId) {
  const id = Number(chainId);
  if (id === 11155111) return "Sepolia";
  if (id === 31337) return "Hardhat Local (31337)";
  if (id === 17000) return "Holesky";
  return `Chain ${id}`;
}

function trimEth(s) {
  const [a, b = ""] = String(s).split(".");
  return b ? `${a}.${b.slice(0, 4)}` : a;
}

function trimToken(s) {
  const [a, b = ""] = String(s).split(".");
  return b ? `${a}.${b.slice(0, 4)}` : a;
}

// ====== ID DETECT + READ ======
function isZeroAddress(addr) {
  return !addr || String(addr).toLowerCase() === "0x0000000000000000000000000000000000000000";
}

async function detectIdStart() {
  if (ID_START !== null) return ID_START;
  if (!market) return 0;

  try {
    await market.getArt(0);
    ID_START = 0;
    return ID_START;
  } catch {}

  try {
    await market.getArt(1);
    ID_START = 1;
    return ID_START;
  } catch {}

  ID_START = 0;
  return ID_START;
}

async function readArt(id) {
  const r = await market.getArt(id);

  const title = r.title ?? r[0];
  const imageURL = r.imageURL ?? r[1];
  const price = r.price ?? r[2];
  const seller = r.seller ?? r[3];
  const buyer = r.buyer ?? r[4];

  let sold = r.sold;
  if (sold === undefined) sold = r[5];
  if (sold === undefined) sold = !isZeroAddress(buyer);

  return { title, imageURL, price, seller, buyer, sold };
}

// ====== TABS ======
function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
}

async function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".content-section").forEach((s) => s.classList.remove("active"));

  document.querySelector(`[data-tab="${name}"]`)?.classList.add("active");
  document.getElementById(name)?.classList.add("active");

  if (name === "marketplace") await loadMarketplace();
  if (name === "myart") await loadMyCollection();
  if (name === "stats") await loadStats();
}

// ====== LIST ART ======
function setupMintForm() {
  const form = document.getElementById("mintForm");
  form?.addEventListener("submit", handleListArt);
}

async function handleListArt(e) {
  e.preventDefault();
  if (!(await ensureConnected())) return;

  const title = document.getElementById("artTitle")?.value.trim();
  const imageURL = document.getElementById("artImageURI")?.value.trim();
  const priceEth = document.getElementById("artPrice")?.value;
  const desc = document.getElementById("artDescription")?.value.trim() || "";

  try {
    if (!title || !imageURL || !priceEth) {
      throw new Error("Please fill in Title, Image URI, and Price");
    }

    const priceWei = ethers.parseEther(String(priceEth));
    const fee = await market.listingFee();

    renderMessage(
      `Listing artwork... Fee: ${trimEth(ethers.formatEther(fee))} ETH. Confirm in MetaMask`,
      "success"
    );

    const tx = await market.listArt(title, imageURL, priceWei, { value: fee });
    const receipt = await tx.wait();

    let newId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = market.interface.parseLog(log);
        if (parsed?.name === "ArtListed") {
          newId = Number(parsed.args.id);
          break;
        }
      } catch {}
    }

    if (newId !== null) {
      localStorage.setItem(descKey(newId), desc);
    }

    renderMessage("Artwork listed successfully ✅", "success");
    document.getElementById("mintForm")?.reset();

    await loadMarketplace();
    await loadMyCollection();
    await loadStats();
  } catch (e2) {
    renderMessage(`Error: ${e2.message}`, "error");
    console.error(e2);
  }
}

function descKey(id) {
  // ✅ use clean address to keep keys consistent
  return `desc_${MARKET_ADDRESS_CLEAN}_${id}`;
}

// ====== LOAD MARKETPLACE ======
async function loadMarketplace() {
  const grid = document.getElementById("artGrid");
  if (!grid) return;

  grid.innerHTML = `<div class="loading">Loading artwork...</div>`;

  try {
    if (!market) {
      grid.innerHTML = `<div class="loading">Connect your wallet to load artworks</div>`;
      return;
    }

    const count = Number(await market.artCount());
    if (count === 0) {
      grid.innerHTML = `<div class="loading">No artworks yet</div>`;
      return;
    }

    const start = await detectIdStart();
    const items = [];

    for (let k = 0; k < count; k++) {
      const id = start + k;
      try {
        const a = await readArt(id);
        if (!a.sold) items.push({ id, ...a });
      } catch (err) {
        console.warn("getArt failed at", id, err);
      }
    }

    if (items.length === 0) {
      grid.innerHTML = `<div class="loading">All sold</div>`;
      return;
    }

    grid.innerHTML = items.map((a) => artCard(a, true)).join("");
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="loading">Failed to load marketplace</div>`;
  }
}

// ====== LOAD MY ACTIVITY ======
async function loadMyCollection() {
  const grid = document.getElementById("myArtGrid");
  if (!grid) return;

  grid.innerHTML = `<div class="loading">Loading your activity...</div>`;

  try {
    if (!market || !userAddress) {
      grid.innerHTML = `<div class="loading">Please connect your wallet</div>`;
      return;
    }

    const count = Number(await market.artCount());
    if (count === 0) {
      grid.innerHTML = `<div class="loading">No items yet</div>`;
      return;
    }

    const start = await detectIdStart();
    const mine = [];
    const me = userAddress.toLowerCase();

    for (let k = 0; k < count; k++) {
      const id = start + k;
      try {
        const a = await readArt(id);
        const seller = String(a.seller).toLowerCase();
        const buyer = String(a.buyer).toLowerCase();

        if (seller === me || buyer === me) {
          mine.push({ id, ...a });
        }
      } catch (err) {
        console.warn("getArt failed at", id, err);
      }
    }

    if (mine.length === 0) {
      grid.innerHTML = `<div class="loading">No activity yet</div>`;
      return;
    }

    grid.innerHTML = mine.map((a) => artCard(a, false)).join("");
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="loading">Failed to load activity</div>`;
  }
}

// ====== CARD + BUY ======
function artCard(a, showBuyButton) {
  const priceEth = ethers.formatEther(a.price);
  const sellerShort = `${a.seller.slice(0, 6)}...${a.seller.slice(-4)}`;
  const statusText = a.sold ? "Sold" : "Available";
  const statusClass = a.sold ? "status-sold" : "status-available";

  const desc = localStorage.getItem(descKey(a.id)) || "—";
  const isMine = userAddress && String(a.seller).toLowerCase() === String(userAddress).toLowerCase();

  const buyBtn =
    showBuyButton && !a.sold
      ? isMine
        ? `<button class="btn" disabled title="You cannot buy your own art">Buy</button>`
        : `<button class="btn" onclick="buyArt(${a.id}, '${a.price.toString()}')">Buy</button>`
      : "";

  return `
    <div class="art-card">
      <img src="${escapeHtml(a.imageURL)}"
           alt="${escapeHtml(a.title)}"
           class="art-image"
           onerror="this.src='https://via.placeholder.com/280x200?text=Art+Image'">

      <div class="art-info">
        <div class="art-title">${escapeHtml(a.title)}</div>
        <div class="art-description">${escapeHtml(desc || "No description")}</div>
        <div class="art-price">${trimEth(priceEth)} ETH</div>

        <div class="art-meta">
          Seller: ${sellerShort}<br>
          Art ID: #${a.id}
        </div>

        <span class="status-badge ${statusClass}">${statusText}</span>
        ${buyBtn}
      </div>
    </div>
  `;
}

window.buyArt = async function buyArt(id, priceWeiString) {
  if (!(await ensureConnected())) return;

  try {
    renderMessage("Purchasing... Confirm the transaction in MetaMask", "success");

    const tx = await market.buyArt(id, { value: BigInt(priceWeiString) });
    await tx.wait();

    renderMessage("Purchase successful ✅", "success");
    await loadMarketplace();
    await loadMyCollection();
    await loadStats();
  } catch (e) {
    renderMessage(`Purchase error: ${e.message}`, "error");
    console.error(e);
  }
};

// ====== STATS ======
async function loadStats() {
  try {
    if (!market) return;

    const count = Number(await market.artCount());
    const start = await detectIdStart();

    let available = 0;
    for (let k = 0; k < count; k++) {
      const id = start + k;
      try {
        const art = await readArt(id);
        if (!art.sold) available++;
      } catch {}
    }

    const t = document.getElementById("totalArtworks");
    const a = document.getElementById("availableArtworks");
    if (t) t.textContent = String(count);
    if (a) a.textContent = String(available);

    // ✅ show real reward token balance
    const rt = document.getElementById("myRewardTokens");
    if (rt) {
      if (!rewardToken || !userAddress) {
        rt.textContent = "0";
      } else {
        try {
          const bal = await rewardToken.balanceOf(userAddress);
          const human = ethers.formatUnits(bal, rewardDecimals);
          rt.textContent = `${trimToken(human)} ${rewardSymbol}`;
        } catch (e) {
          console.warn("token balance error", e);
          rt.textContent = `0 ${rewardSymbol}`;
        }
      }
    }

    const ts = document.getElementById("myTotalSales");
    if (ts) ts.textContent = "0 ETH";
  } catch (e) {
    console.error("stats error", e);
  }
}

// ====== MESSAGES ======
function renderMessage(text, type) {
  const container = document.getElementById("messageContainer");
  if (!container) return;

  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.textContent = text;

  container.innerHTML = "";
  container.appendChild(div);

  setTimeout(() => {
    if (div.parentNode) div.remove();
  }, 4500);
}

// ====== HELPERS ======
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039");
}
