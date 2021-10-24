import * as React from 'react'
import routToPage from './router'
import * as crypto from './crypto'
import * as helpers from './helpers'

import backButtonVideo from './../assets/back_button.mkv'
import {appendLoadingAnimation, removeLoadingAnimation} from './loadingAnimation'
import {errorPopup} from './errorPopup'

export default function Staker(props) {

  const hackathon = props.canisters.hackathon;
  const token = props.canisters.token;

  const [amount, setAmount] = React.useState('')
  const [duration, setDuration] = React.useState('')
  const [stakerId, setStakerId] = React.useState('')
  const [revealSecretId, setRevealSecretId] = React.useState('')
  const [stakerPrivateKey, setStakerPrivateKey] = React.useState('')

  async function isRegistered() {
    return await hackathon.isRegistered()
  }

  async function registerStaker() {
    const keyPair = crypto.generateKeyPair()

    const result = await hackathon.registerStaker(keyPair.publicKey)

    if ('ok' in result) {
      let publicKey = result['ok']
      console.log("Staker registerd with public key", publicKey)
      console.log("PrivateKey:", keyPair.privateKey)

      downloadPrivateKey(keyPair.privateKey)
      alert(`The private key was saved as a download. \nMake sure to store this file securely, since you will need it to decrypt your share.`)
    }

    if ('err' in result) {
      const err = result['err']
      if ('alreadyRegistered' in err) {
        let principal = err['alreadyRegistered']
        alert(`User with principal ${principal.toString()} is already a registered staker!`)
      } else if ('invalidKey' in err) {
        // base64 is guaranteed by crypto.js
        alert(`Generated public key ${err['invalidKey']} is not a valid key!`)
      } else {
        alert(`Something went wrong!`)
      }
      console.error("RegisterStakerError:", err)
    }

    listAllStakes()
  }

  async function revealSecretShare() {
    if (!(await isRegistered())) {
      alert("Please register first!")
      return
    }

    appendLoadingAnimation("reveal_secret_share_button", false)

    let addButton = document.getElementById("reveal_secret_share_button")
    addButton.classList.add("trigger-animation")

    document.getElementById("reveal-secret-from").reset()

    const backendPublicKey = await hackathon.lookupMyPublicKey()
    console.log("PublicKey:", backendPublicKey[0])
    
    let secretId
    try {
      secretId = helpers.getNaturalNumber(revealSecretId)
    } catch (error) {
      console.log(error)
      alert('Secret id must be a positive number!')
      removeLoadingAnimation()
      return
    }

    let relevantSecret = await hackathon.getRelevantSecret(secretId)
    //console.log('relevantSecret', relevantSecret)

    if (relevantSecret.len == 0) {
      alert(`No secret for id ${secretId}!`)
      removeLoadingAnimation()
      return
    }
    let secret = relevantSecret[0]

    console.log("Secret to reveal", secret)

    // check if decryption of secret is allowed (time or heartbeat)
    // check if secret already decrypted
    if (secret.hasRevealed) {
      alert("You already have revealed your share of this secret!")
      removeLoadingAnimation()
      return
    }
    if (!secret.shouldReveal) {
      alert("You should not reveal your shares of this secret yet!")
      removeLoadingAnimation()
      return
    }

    let decryptedShares = []
    try {
      const uploaderPublicKey = secret['uploader_public_key']

      console.log(stakerPrivateKey)

      for (let j = 0; j < secret.relevantShares.length; j++) {
        decryptedShares.push(crypto.decryptKeyShare(secret.relevantShares[j], stakerPrivateKey, uploaderPublicKey))
      }
      console.log("decryptedShares", decryptedShares)


    } catch (error) {
      console.log(`Failed decryption: ${error}`)
      alert(`Failed decryption: ${error}`)
      removeLoadingAnimation()
      return
    }

    
    let result = await hackathon.revealAllShares(secret.secret_id, decryptedShares);
    if ('ok' in result) {
      let payout = result['ok']['payout']
      console.log('updatedSecret', result['ok']['secret'])
      alert(`Successfully revealed your shares for secret with id ${secret.secret_id} with payout ${payout}`)
    }
    if ('err' in result) {
      const err = result['err']
      if ('secretNotFound' in err) {
        alert(`Secret with id ${err['secretNotFound']} was not found!`)
      } else if ('invalidDecryptedSHA' in err) {
        alert(`SHA of decrypted share did not match!`)  // wrong shares, wrong order -> should not happen
      } else if ('wrongNumberOfShares' in err) {
        alert(`Invalid number of shares uploaded!`) // -> should not happen
      } else if ('alreadyRevealed' in err) {
        alert(`You have already revealed this secret!`)
      } else if ('insufficientFunds' in err) {
        alert(`Insufficient funds: ${err['insufficientFunds']}`)
      } else if ('revealedTooSoon' in err) {
        alert(`You should not reveal this secret yet!`)
      } else {
        alert(`Something went wrong!`)
      }
      console.error(err)
    }

    listAllRelevantSecrets()
    addButton.classList.remove("trigger-animation")
    removeLoadingAnimation()
  }

  async function addStake() {
    if (!(await isRegistered())) {
      alert("Please register first!")
      return
    }

    appendLoadingAnimation("add_new_stake_button", false)
    console.log("addStake")

    let amountInt
    let durationInt
    try {
      amountInt = helpers.getPositiveNumber(amount)
      durationInt = helpers.getPositiveNumber(duration)
    } catch (error) {
      removeLoadingAnimation()
      alert('Amount and duration must be positive numbers!')
      console.log(error)
      return
    }

    document.getElementById('staker_form').reset()
    
    let hackathonID = await hackathon.identity();
    let ok = await token.approve(hackathonID, amountInt, []); // should not throw error
    const result = await hackathon.addStake(amountInt, durationInt)

    removeLoadingAnimation()
    listAllStakes()

    if ('ok' in result) {
      let newStakeId = result['ok']
      alert(`Stake with id ${newStakeId} was added!`)
    }
    if ('err' in result) {
      const err = result['err']
      if ('unknownStaker' in err) {
        alert(`You (${err['unknownStaker'].toString()}) are not a registered staker!`)
      } else if ('invalidDuration' in err) {
        alert(`Could not add a stake with invalid duration ${err['invalidDuration']}`)
      } else if ('transferError' in err) {
        alert(`Failed token transfer: ${err['transferError']}`)
      } else {
        alert(`Something went wrong!`)
      }
      console.error(result['err'])
    }
  }

  async function endStake(id) {
    appendLoadingAnimation("stakerTable", true)
    const result = await hackathon.endStake(id)

    removeLoadingAnimation()
    listAllStakes()

    if ('ok' in result) {
      alert(`End stake with payout ${result['ok']['payout']}`)
    }
    if ('err' in result) {
      const err = result['err']
      if ('stakeNotFound' in err) {
        let stake_id = err['stakeNotFound']
        alert(`Stake with id ${stake_id} was not found!`)
      } else if ('permissionDenied' in err) {
        // should not happen as staker only sees his stakes.
        alert(`You don't have permission to end this stake.`)
      } else if ('alreadyPayedOut' in err) {
        alert(`Stake was already ended and payed out!`)
      } else if ('insufficientFunds' in err) {
        alert(`Insufficient funds: ${err['insufficientFunds']}`)
      } else {
        alert(`Something went wrong!`)
      }
      console.error(err)
    }
  }

  // write private key to file and safe to downloads
  // staker_id is prepended to the file name
  function downloadPrivateKey(privateKey) {
    if (privateKey == null) {
      alert("Please create your private key first")
    }
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(privateKey));
    element.setAttribute('download', 'private_key');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  async function listAllStakes() {
    let stakes = await hackathon.listMyStakes()
    stakes.sort(function(a, b) { 
      return - (parseInt(b.staker_id) - parseInt(a.staker_id));
    });

    const table = document.getElementById('stakerTable')

    const col_names = ['amount', 'expiry_time']
    table.innerHTML = ''

    const tr = table.insertRow(-1)
    for (const cn of col_names) {
      const tabCell = tr.insertCell(-1)
      tabCell.innerHTML = cn
    }
    // const deleteCell = tr.insertCell(-1)
    // deleteCell.innerHTML = "delete"


    stakes.map(function (s) {
      const tr = table.insertRow(-1)
      const amountCell =  tr.insertCell(-1)
      amountCell.innerHTML = s['amount']

      const dateCell = tr.insertCell(-1)

      let expiryDate = helpers.secondsSinceEpocheToDate(s['expiry_time'])
      let options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      dateCell.innerHTML = expiryDate.toLocaleString('en-GB', options)

      const deleteButtonCell = tr.insertCell(-1)
      const deleteButton = document.createElement('button')
      deleteButton.innerHTML = "End Stake"
      deleteButton.className = "endStakeButton"
      let newDate = new Date()
      if (newDate < expiryDate) {
        deleteButton.addEventListener("click", () => { endStake(s['stake_id'])})
      } else {
        deleteButton.disabled = true;
        amountCell.style.color = '#1010104d';
        dateCell.style.color = '#1010104d';
      }

      deleteButtonCell.appendChild(deleteButton)
    });
  }

  async function listAllRelevantSecrets() {

    let relevantSecrets = await hackathon.listRelevantSecrets()
    relevantSecrets.sort(function(a, b) { 
      return - (parseInt(b.secret_id) - parseInt(a.secret_id));
    });

    //console.log(relevantSecrets)

    const table = document.getElementById('secretsTable')

    const col_names = ['secret_id', 'n_shares', 'shouldReveal', 'hasRevealed']
    table.innerHTML = ''

    const tr = table.insertRow(-1)
    for (const cn of col_names) {
      const tabCell = tr.insertCell(-1)
      tabCell.innerHTML = cn
    }

    relevantSecrets.map(function (s) {
      const tr = table.insertRow(-1)

      const idCell = tr.insertCell(-1)
      
      const secretIdText = document.getElementById('revealSecretId')
      // TODO: make visibile that cell is clickable
      idCell.addEventListener("click", function() {
        console.log(s.secret_id)
        setRevealSecretId(s.secret_id)
        secretIdText.value = s.secret_id
      })
      idCell.innerHTML = s.secret_id

      const sharesCell = tr.insertCell(-1)
      sharesCell.innerHTML = s.relevantShares.length

      const shouldCell = tr.insertCell(-1)
      shouldCell.innerHTML = s.shouldReveal

      const hasCell = tr.insertCell(-1)
      hasCell.innerHTML = s.hasRevealed
    });
  }

  React.useEffect(() => {
    listAllStakes()
    listAllRelevantSecrets()
  }, []);

  return (
    <div class="eventHorizon">
      <div class="header-n-nav">
        <a onClick={() => {routToPage('Main')}}>
          <video autoPlay loop muted class="back-button-video">
            <source src={backButtonVideo}/>
          </video>
        </a>
        <h1>Staker</h1>
      </div>

      <div class="description-and-wallet">
        <div class="description">
          <p>Stake $HRBT to receive shares.</p>
          <p>When you reveal a secret at the right time, you will be richly rewarded.</p>
        </div>
        <div class="wallet-in-app">
          <div>
            <p>Balance:</p>
            <b>300 $HRBT</b>
          </div>
          <div>
            <button>Top Up + 100 $HRBT</button>
          </div>
        </div>
      </div>
      

      <div id="register" className="panel">
        <button onClick={() => registerStaker()}>Register Staker</button>
      </div>

      <div className="panel">
        <h3>Create new Stake</h3>
        <form id="staker_form">
          <label htmlFor="stakeAmount">Amount:</label>
          <span><input id="stakeAmount" type="number" autoComplete='off' onChange={(ev) => setAmount(ev.target.value)}/></span>
          <label htmlFor="stakeDuration">Duration (Days):</label>
          <span><input id="stakeDuration" type="number" autoComplete='off' onChange={(ev) => setDuration(ev.target.value)}/></span>
        </form>
        <a id="add_new_stake_button" data-text="Start Stake" onClick={addStake} className="rainbow-button" style={{width: 200}}></a>
      </div>

      <div className="panel">
        <h3>My Stakes</h3>
        <table id="stakerTable" cellPadding={5}/>
      </div>

      <div className="panel">
        <h3>My Secret Shares</h3>
        <table id="secretsTable" cellPadding={5}/>
      </div>

      <div className="panel">
        <h3>Reveal a secret share</h3>
        <form id="reveal-secret-from">
          <label htmlFor="stakerId">Enter secret ID:</label>
          <span><input id="revealSecretId" type="number" autoComplete='off' onChange={(ev) => setRevealSecretId(ev.target.value)}/></span>

          <label htmlFor="stakerPrivateKey">Enter your private key:</label>
          <span><input id="stakerPrivateKey" type="text" autoComplete='off' onChange={(ev) => setStakerPrivateKey(ev.target.value)}/></span>
        </form>
        <a id="reveal_secret_share_button" data-text="Reveal Secret Share" onClick={revealSecretShare} className="rainbow-button" style={{width: 330}}></a>
      </div>

      <a onClick={() => {routToPage('Main')}}>
        <video autoPlay loop muted class="back-button-video">
          <source src={backButtonVideo}/>
        </video>
      </a>
    </div>
  );

};

