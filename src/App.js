import 'regenerator-runtime/runtime'
import React from 'react'
import { login, logout } from './utils'
import './global.css'

import getConfig from './config'
const { networkId } = getConfig(process.env.NODE_ENV || 'development')

export default function App() {
  // use React Hooks to store username in component state
  const [username, setUsername] = React.useState()

  // when the user has not yet interacted with the form, disable the button
  const [buttonDisabled, setButtonDisabled] = React.useState(true)

  // after submitting the form, we want to show Notification
  const [showNotification, setShowNotification] = React.useState(false)

  // The useEffect hook can be used to fire side-effects during render
  // Learn more: https://reactjs.org/docs/hooks-intro.html
  React.useEffect(
    () => {
      // in this case, we only care to query the contract when signed in
      if (window.walletConnection.isSignedIn()) {

        // window.contract is set by initContract in index.js
        window.contract.getTwitterUsername({ accountId: window.accountId })
          .then(usernameFromContract => {
            setUsername(usernameFromContract)
          })
      }
    },

    // The second argument to useEffect tells React when to re-run the effect
    // Use an empty array to specify "only run on first render"
    // This works because signing into NEAR Wallet reloads the page
    []
  )

  // if not signed in, return early with sign-in prompt
  if (!window.walletConnection.isSignedIn()) {
    return (
      <main>
        <h1>Welcome to <code>.near</code> club NFT drop</h1>
        <p>
          To claim the NFT drop, you need to sign in. The button
          below will sign you in using NEAR Wallet.
        </p>
        <p>
          Go ahead and click the button below to try it out:
        </p>
        <p style={{ textAlign: 'center', marginTop: '2.5em' }}>
          <button onClick={login}>Sign in</button>
        </p>
      </main>
    )
  }

  return (
    // use React Fragment, <>, to avoid wrapping elements in unnecessary divs
    <>
      <button className="link" style={{ float: 'right' }} onClick={logout}>
        Sign out
      </button>
      <main>
        <h1>
          Hello
          {' '/* React trims whitespace around tags; insert literal space character when needed */}
          {window.accountId}!
        </h1>
        { username
          ? <p>You've already connected <a href={`https://twitter.com/${username}`}>{username}</a> Twitter account. You can update to use different Twitter account:</p>
          : <p>Claim your <code>.near</code> club membership using these instructions:</p>
        }
        <ol>
          <li>
            Change your account name in Twitter to include your <code>.near</code> username, e.g. <b>Illia Polosukhin (root.near)</b>.
          </li>
          <li>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              'Check out this NFT drop: https://twitter.com/vgrichina/status/1442392328610598915?s=20\n\n#dotnearfollowdotnear')}`}>
              Tweet</a> about this project, including <code>#dotnearfollowdotnear</code> hashtag.
          </li>
          <li>
            Submit your request in the form below.
          </li>
          <li>
            Wait for few days until you receive NFT in the wallet. Keep your .near account name on Twitter.
          </li>
          <li>
            NFT you get is dynamic and generated fully on chain. It'll keep updating as we grow .near community.
          </li>
        </ol>

        <form onSubmit={async event => {
          event.preventDefault()

          // get elements from the form using their id attribute
          const { fieldset, username } = event.target.elements

          // hold onto new user-entered value from React's SynthenticEvent for use after `await` call
          const newUsername = username.value

          // disable the form while the value gets updated on-chain
          fieldset.disabled = true

          try {
            // make an update call to the smart contract
            await window.contract.setTwitterUsername({
              username: newUsername
            })
          } catch (e) {
            alert(
              'Something went wrong! ' +
              'Maybe you need to sign out and back in? ' +
              'Check your browser console for more info.'
            )
            throw e
          } finally {
            // re-enable the form, whether the call succeeded or failed
            fieldset.disabled = false
          }

          // update local `username` variable to match persisted value
          setUsername(newUsername)

          // show Notification
          setShowNotification(true)

          // remove Notification again after css animation completes
          // this allows it to be shown again next time the form is submitted
          setTimeout(() => {
            setShowNotification(false)
          }, 11000)
        }}>
          <fieldset id="fieldset">
            <label
              htmlFor="username"
              style={{
                display: 'block',
                color: 'var(--gray)',
                marginBottom: '0.5em'
              }}
            >
              Your Twitter username
            </label>
            <div style={{ display: 'flex' }}>
              <input
                autoComplete="off"
                defaultValue={username}
                id="username"
                onChange={e => setButtonDisabled(e.target.value === username)}
                style={{ flex: 1 }}
              />
            </div>
            <button
              disabled={buttonDisabled}
              style={{ borderRadius: '0 5px 5px 0' }}
            >
              Save
            </button>
          </fieldset>
        </form>

        <hr />
        <p>
          To see how to make apps like this, check out <a target="_blank" rel="noreferrer" href="https://docs.near.org">the NEAR docs</a> or look through some <a target="_blank" rel="noreferrer" href="https://examples.near.org">example apps</a>.
        </p>
      </main>
      {showNotification && <Notification />}
    </>
  )
}

// this component gets rendered by App after the form is submitted
function Notification() {
  const urlPrefix = `https://explorer.${networkId}.near.org/accounts`
  return (
    <aside>
      <a target="_blank" rel="noreferrer" href={`${urlPrefix}/${window.accountId}`}>
        {window.accountId}
      </a>
      {' '/* React trims whitespace around tags; insert literal space character when needed */}
      called method: 'setTwitterUsername' in contract:
      {' '}
      <a target="_blank" rel="noreferrer" href={`${urlPrefix}/${window.contract.contractId}`}>
        {window.contract.contractId}
      </a>
      <footer>
        <div>✔ Succeeded</div>
        <div>Just now</div>
      </footer>
    </aside>
  )
}
