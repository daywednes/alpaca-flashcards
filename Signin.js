/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React from 'react';
import { GoogleSignin, GoogleSigninButton } from 'react-native-google-signin';

const _ = require('lodash');

export default class Signin extends React.Component {

  render() {
    GoogleSignin.hasPlayServices({ autoResolve: true })
    .then(() => {
    })
    .catch((err) => {
      console.log("Play services error", err.code, err.message);
    });

    GoogleSignin.configure({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      iosClientId: '208998088995-o9ki8qrtvjs3ac6cu4vaj3mefka8bhej.apps.googleusercontent.com', // only for iOS
    })
    .then(() => {
    });

    GoogleSignin.signIn()
    .then((user) => {
      this.setState({ user: user });
      var endpoint = 'https://sheets.googleapis.com/v4/spreadsheets';
      var sheetId = '15NvtH2b6UmzsH2WF0dh9ema8lPX7_E6XMVlecCtKbaE';
      fetch(`${endpoint}/${sheetId}/values/Sheet1!A2:Y999/?access_token=${user.accessToken}`)
      .then((response) => {
        response.json().then((data) => {
          const importer = new Importer();
          importer.import(data.values);
        });
      });
    })
    .catch((err) => {
      console.log('WRONG SIGNIN', err);
    })
    .done();

    return (
      <GoogleSigninButton
        style={{ width: 230, height: 48 }}
        size={GoogleSigninButton.Size.Standard}
        color={GoogleSigninButton.Color.Dark} />
    );
  }
}

const styles = StyleSheet.create({
})
