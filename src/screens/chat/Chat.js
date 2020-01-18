import React, { Component } from 'react'

import {
    KeyboardAvoidingView,
    View,
    Dimensions,
    Text,
    AsyncStorage,
    Image,
    Animated,
    Keyboard,
    FlatList,
    Platform,
    TextInput,
    TouchableOpacity,
    ImageBackground,
    StyleSheet,
} from 'react-native'

import { Header } from 'react-navigation-stack'

import firebase from 'firebase'

const isIOS = Platform.OS === 'ios'

class Chat extends Component {

    _isMounted = false

    constructor(props) {

        super(props)

        this.state = {
            person: {
                uid: props.navigation.getParam('uid'),
                name: props.navigation.getParam('name'),
                email: props.navigation.getParam('email'),
                image: props.navigation.getParam('image')
            },
            textMessage: '',
            messageList: []
        }

        this.keyboardHeight = new Animated.Value(0)
        this.bottomPadding = new Animated.Value(80)

    }

    static navigationOptions = ({ navigate }) => {
        headerTitle: () => <Text> test </Text>
    }

    async _fetchdata () {

        this._isMounted = true

        const uid = await AsyncStorage.getItem('userToken')

        await firebase.database().ref('messages').child(uid).child(this.state.person.uid).on('child_added', (value) => {
                if (this._isMounted) {
                    this.setState(prevState => {
                        return {
                            messageList: prevState.messageList.concat(value.val())
                        }
                    })
                }
            })

    }

    componentDidMount() {

        this.keyboardShowListener = Keyboard.addListener(isIOS ? 'keyboardWillShow' : 'keyboarDidShow',
        (e) => this.keyboardEvent(e, true))

        this.keyboardShowListener = Keyboard.addListener(isIOS ? 'keyboardWillHide' : 'keyboarDidHide',
        (e) => this.keyboardEvent(e, false))

        this._fetchdata()

    }

    componentWillUnmount() {

        this._isMounted = false

    }

    keyboardEvent = (event, isShow) => {

        let HeightOS = isIOS ? 60 : 0
        let bottomOS = isIOS ? 120 : 60

        Animated.parallel([
            Animated.timing(this.keyboardHeight, {
                duration: event.duration,
                toValue: isShow ? HeightOS : 0
            }),
            Animated.timing(this.bottomPadding, {
                duration: event.duration,
                toValue: isShow ? bottomOS : 60
            })
        ]).start()

    }

    _handleMessage = key => value => {

        this.setState({ [key]: value })

    }

    _convertTime = (time) => {

        let d = new Date(time)
        let c = new Date()
        let result = (d.getHours < 10 ? '0' : '') + d.getHours() + ':'
        result += (d.getMinutes < 10 ? '0' : '') + d.getMinutes()
        if(c.getDay() !== d.getDay()) {
            result = d.getDay() + ' ' + d.getMonth() + ' ' + result
        }
        return result

    }

    _sendMessage = async () => {

        const uid = await AsyncStorage.getItem('userToken')

        if(this.state.textMessage.trim().length > 0) {
            let msgId = firebase.database().ref('messages').child(uid).child(this.state.person.uid).push().key
            let updates = {}
            let message = {
                message: this.state.textMessage,
                time: firebase.database.ServerValue.TIMESTAMP,
                from: this.state.person.uid
            }
            updates[`${uid}/${this.state.person.uid}/${msgId}`] = message
            updates[`${this.state.person.uid}/${uid}/${msgId}`] = message
            firebase.database().ref('messages').update(updates)

            let msgId2 = firebase.database().ref('user_conversations').child(this.state.person.uid).push().key
            let updates2 = {}
            let message2 = {
                name: this.state.person.name,
                email: this.state.person.email,
                uid: this.state.person.uid,
                lastMessage: this.state.textMessage
            }


            updates2[`${uid}/${this.state.person.uid}/${msgId}`] = message2
            updates2[`${this.state.person.uid}/${uid}/${msgId}`] = message2
            firebase.database().ref('user_conversations').update(updates2)

            this.setState({ textMessage: '' })
        }

    }

    _renderRow = ({ item }) => {

        const { currentUser } = firebase.auth()

        return (
            <View style={{
                flexDirection: 'row',
                maxWidth: '60%',
                alignSelf: item.from === currentUser.uid ? 'flex-end' : 'flex-start',
                backgroundColor: item.from === currentUser.uid ? '#adb9c5' : '#eaedf0',
                borderRadius: 5,
                marginBottom: 10
            }}>
                <Text style={{
                    color: '#2e4963',
                    padding: 7,
                    fontSize: 16
                }}>
                    { item.message }
                </Text>
                <Text style={{
                    color: '#2e4963',
                    marginTop: 3,
                    marginRight: 5,
                    fontSize: 11
                }}>
                    { this._convertTime(item.time) }
                </Text>
            </View>
        )

    }

    render() {

        let { height } = Dimensions.get('window')

        return (
            <>
                <KeyboardAvoidingView keyboardVerticalOffset = {Header.useHeaderHight + 5} behavior="height" style={{ flex: 1 }}>
                    <Animated.View style={[
                            styles.bottomBar,
                            { bottom: this.keyboardHeight }
                        ]}>
                        <TextInput
                            style={{
                                padding: 10,
                                borderWidth: 1,
                                borderColor: '#5c748b',
                                color: '#2e4963',
                                width: '80%',
                                marginBottom: 10,
                                borderRadius: 5,
                            }}
                            placeholderTextColor='#2e4963'
                            value={this.state.textMessage}
                            placeholder="Message"
                            onChangeText={this._handleMessage('textMessage')}
                        />
                        <TouchableOpacity style={{
                                height: 40,
                                width: 40,
                                paddingTop: 10,
                                paddingBottom: 10,
                                paddingLeft: 10,
                                paddingRight: 10,
                                marginLeft: 12,
                                marginBottom: 8,
                                borderRadius: 20,
                                alignItems: 'center'
                            }} onPress={() => this._sendMessage()}>
                            <Image source={ require('../../assets/send/send.png') } style={{
                                resizeMode: 'contain',
                                height: 20,
                                tintColor: '#5c748b'
                            }}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                    <ImageBackground source={require('../../assets/images/ic_chat_background.png')} style={{ flex: 1, width: null }}>
                        <FlatList
                            ref={ref => this.FlatList = ref}
                            onContentSizeChange={() => this.FlatList.scrollToEnd({ animated: true })}
                            onLayout={() => this.FlatList.scrollToEnd({ animated: true })}
                            style={{ padding: 10, height: height * 0.8 }}
                            data={ this.state.messageList }
                            renderItem={ this._renderRow }
                            keyExtractor={ (item, index) => index.toString() }
                            ListFooterComponent={ <Animated.View style={{ height: this.bottomPadding }} /> }
                        />
                    </ImageBackground>
                </KeyboardAvoidingView>
            </>
        )
    }
}


const styles = StyleSheet.create({
    bottomBar: {
        backgroundColor: '#d6dce2',
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        padding: 5,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        height: 60
    }
})

export default Chat
