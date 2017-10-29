/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React from 'react';
import { FlatList, StyleSheet, Text, View, TouchableHighlight, Button, TouchableWithoutFeedback, TouchableOpacity, RefreshControl } from 'react-native';
import Swipeout from 'react-native-swipeout';
import Icon from 'react-native-vector-icons/FontAwesome';
import Modal from 'react-native-modal';
import { GoogleSignin, GoogleSigninButton } from 'react-native-google-signin';

import realm from '../app/db/realm';
import Importer from '../app/Importer';

const _ = require('lodash');

import Signin from './Signin';

const DrawerButton = (props) => {
  return (
    <View>
      <TouchableOpacity onPress={() => { props.navigation.navigate('DrawerOpen') }}>
        <Icon.Button name='refresh' size={32} style={{paddingLeft: 10}}/>
      </TouchableOpacity>
    </View>
  );
};

class Phrases extends React.Component {
  static navigationOptions = ({ navigation }) => {
    const { params } = navigation.state;
    return {
      title: "Today's English phrases",
      headerRight: (
        <Icon.Button
          name='refresh'
          color='blue'
          backgroundColor='transparent'
          onPress={() => params.refreshPickups()}
        />
      ),
    };
  };

  constructor(props) {
    super(props);
    // realm.write(() => {
    //   realm.objects('Phrase').snapshot().forEach(p => p.completedAt = null);
    // });
    // if (realm.objects('Phrase').length == 0) {
    //   const importer = new Importer();
    //   importer.import();
    // }

    var phrases = this._pickupdPhrases.slice();
    if (phrases.length == 0) {
      phrases = this._pickupPhrases();
    }

    this.state = {
      _data: phrases,
      modalVisible: false,
      refreshing: false,
      selectedPhrase: {},
      user: {},
      spreadsheet: {
        id: null,
        title: null,
        lastSyncedAt: null,
      },
    };
  }

  componentDidMount() {
    this.props.navigation.setParams({
      refreshPickups: this._refreshPickups.bind(this),
    });

    GoogleSignin.configure({
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
      iosClientId: '211779780353-kv9bthgjhqkqdd9e5sfd12e7sali0d95.apps.googleusercontent.com', // only for iOS
    })
    .then(() => {
      GoogleSignin.currentUserAsync().then((user) => {
        this.setState({ user });
      }).done();
    });

    AsyncStorage.multiGet(['GoogleSpreadsheet.id', 'GoogleSpreadsheet.title', 'GoogleSpreadsheet.lastSyncedAt'], (err, stores) => {
      const sheetInfo = _.fromPairs(stores);
      this.setState({
        spreadsheet: {
          id: sheetInfo['GoogleSpreadsheet.id'],
          title: sheetInfo['GoogleSpreadsheet.title'],
          lastSyncedAt: sheetInfo['GoogleSpreadsheet.lastSyncedAt'],
        }
      });
    });

    const sheetInfo = _.at(this.state, ['user', 'spreadsheet.id', 'spreadsheet.title']);
    if (sheetInfo.every(_.negate(_.isEmpty))) {
      const lastSyncedAt = new Date(this.state.spreadsheet.lastSyncedAt);
      var recentlyUpdated = realm.objects('Phrase').filtered('updatedAt > $0', lastSyncedAt);

      // Batch update to spreadsheet.
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <FlatList
          data={this.state._data}
          renderItem={this._renderItem.bind(this)}
          keyExtractor={(item, index) => item.key}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._onRefresh.bind(this)}
            />
          }
        />

        <Modal
          animationIn='fadeIn'
          animationOut='fadeOut'
          animationInTiming={100}
          animationOutTiming={100}
          isVisible={this.state.modalVisible}
          onRequestClose={() => {}} >
          <TouchableWithoutFeedback // This touchable closes modal.
            onPress={() => { this._setModalVisible(false) }} >
            <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }} >
              <View style={{ height: '20%', backgroundColor: 'white', padding: 10 }}>
                <Text style={{ fontSize: 16, lineHeight: 28 }}>
                  {this.state.selectedPhrase.sentence}
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  }

  get _pickupdPhrases() {
    return realm.objects('Phrase').filtered('pickupd = $0', true);
  }

  _refreshPickups() {
    const now = new Date();
    realm.write(() => {
      this._pickupdPhrases.snapshot().forEach(phrase => {
        phrase.pickupd = false;
        phrase.updatedAt = now;
      });
    });
    this.setState({
      _data: this._pickupPhrases(),
    });
  }

  _pickupPhrases() {
    const now = new Date();
    const pickupd = realm.objects('Phrase').filtered('completedAt = $0', null).slice(0, 8);
    realm.write(() => {
      pickupd.forEach(phrase => {
        phrase.pickupd = true;
        phrase.updatedAt = now;
      });
    });
    return pickupd;
  }

  _completePhrase(item, index) {
    // Update phrase's status.
    const now = new Date();
    realm.write(() => {
      item.completedAt = (item.isCompleted()) ? null : now; // toggle status
      item.updatedAt = now;
    });
    // Update lists for display.
    this.setState({
      _data: _.clone(this.state._data),
    });
  }

  _setModalVisible(visible) {
    this.setState({ modalVisible: visible });
  }

  _showPhraseFor(phrase) {
    this.setState({ selectedPhrase: phrase });
    this._setModalVisible(true);
  }

  _onRefresh() {
    this.setState({ refreshing: true });
    fetchData().then(() => {
      this.setState({ refreshing: false });
    });
  }

  _renderTags(item) {
    return (
      <View style={styles.tagView}>
        {
          item.tags.map((tag, index) => {
            return (
              <View style={styles.tagInnerView} key={index}>
                <Text style={styles.tagText}>
                  #{tag.name}
                </Text>
              </View>
            );
          })
        }
      </View>
    );
  }

  _renderItem({ item, index }) {
    const swipeBtns = [{
      text: (item.isCompleted()) ? 'Revert' : 'Complete',
      backgroundColor: 'blue',
      underlayColor: 'rgba(0,0,0,1)',
      onPress: () => { this._completePhrase(item, index) }
    }];

    return (
      <Swipeout
        right={swipeBtns}
        autoClose={true}
        backgroundColor='transparent'>
        <TouchableHighlight
          underlayColor='rgba(192,192,192,1)'
          onPress={() => { this._showPhraseFor(item) }} >
          <View style={[styles.phraseView, item.isCompleted() && styles.phraseDoneView]}>
            <View style={styles.phraseSentenceView}>
              <View style={styles.phraseSentenceBodyView}>
                <Text
                  style={styles.phraseText}
                  ellipsizeMode='tail'
                  numberOfLines={1} >
                  {item.key}
                </Text>
              </View>
              <View style={styles.phraseSentenceAppendixView}>
                <Text style={[styles.phraseText, styles.phraseSentenceAppendixText]} >
                  >
                </Text>
              </View>
            </View>
            {this._renderTags(item)}
            <Text style={styles.phraseCreatedAtText}>
              {item.createdAt.toLocaleString('en-US')}
            </Text>
          </View>
        </TouchableHighlight>
      </Swipeout>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center'
  },
  separator: {
    height: 1,
    backgroundColor: "#CED0CE",
  },
  phraseView: {
    padding: 10,
    height: 72,
  },
  phraseDoneView: {
    backgroundColor: 'lightgray',
  },
  phraseText: {
    fontSize: 18,
    marginBottom: 2,
  },
  phraseCreatedAtText: {
    color: 'dimgray',
    fontSize: 9,
  },
  phraseSentenceView: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  phraseSentenceBodyView: {
    width: '95%',
  },
  phraseSentenceAppendixView: {
    width: '5%',
  },
  phraseSentenceAppendixText: {
    textAlign: 'right',
    color: 'lightgray',
  },
  tagView: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginBottom: 3,
  },
  tagInnerView: {
    marginRight: 5,
  },
  tagText: {
    color: 'midnightblue',
    fontSize: 11,
  },
})

export default Phrases;