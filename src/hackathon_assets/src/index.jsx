import * as React from 'react'
import { render } from 'react-dom'
import routToPage from './router'
import { auth } from './auth'
import Wallet from './wallet'

import keyFlipVideo from './../assets/key-flip.mkv'
import { hackathon } from '../../declarations/hackathon/index'


export default function Main() {
  const [amount, setAmount] = React.useState(0)
  let canisters = auth.canisters

  async function whoami() {
    let id = await canisters.hackathon.whoami()
    let s = id.toString()
    console.log("principal", id)

    if (s == '2vxsx-fae') {
      s += " (anonymous)"
    }
    alert("You are " + s);
  }

  async function createWallet() {
    render(React.createElement(Wallet, auth.getProps()), document.getElementById('my-wallet'))
  }

  React.useEffect(async () => {
    window.scrollTo(0,0);

    // uncomment next line to use with auth
    // await auth.auth(); let x = await auth.getCanisters()

    // uncomment next line to use without auth
    let x = await auth.getAnomymousCanisters()
   
    canisters = auth.canisters
    console.log("useEffect Canisters", x, canisters)
    createWallet()
  }, [])


  return (
    <div class="eventHorizon">
      <h1>Yeet Man’s Switch</h1>
      Regularly verify that you are alive, otherwise your uploaded Secrets will get published.

      <div className="panel">
        <video autoPlay loop muted className="key-flip-video">
          <source src={keyFlipVideo}/>
        </video>

        <div id="start-if-auth" className="start-page-button-div">
          <a id="staker_button" data-text="Staker" onClick={() => routToPage('Staker', auth.getProps())} className="rainbow-button" style={{width: 150}}></a>
          <a id="uploader_button" data-text="Uploader" onClick={() => routToPage('Uploader', auth.getProps())} className="rainbow-button" style={{width: 180}}></a>
          <a id="spectator_button" data-text="Spectator" onClick={() => routToPage('Spectator', auth.getProps())} className="rainbow-button" style={{width: 180}}></a>
        </div>
        <div id="start-if-not-auth" className="start-page-button-div">
          <a id="loginButton" data-text="Authenticate" className="rainbow-button" style={{width: 220}}></a>
          <a id="spectator_button" data-text="Spectator" onClick={() => routToPage('Spectator', auth.getProps())} className="rainbow-button" style={{width: 180}}></a>
        </div>
      </div>

      <div id="my-wallet"/>
      <button onClick={() =>  whoami()}>Who Am I?</button>
      <button onClick={async () => {
        await hackathon.changeToDemoData();
        console.log("Demo Data!")
        }}>Demo Data!</button>
      <button id="logoutButton" onClick={() => auth.logout()}>Logout</button>

    </div>
  );
};

render(<Main />, document.getElementById("app"));
