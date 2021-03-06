'use strict';

const Agent = require('./../lib/AgentSDK');

const agent = new Agent({
    accountId: process.env.LP_ACCOUNT,
    username: process.env.LP_USER,
    password: process.env.LP_PASS,
    csdsDomain: process.env.LP_CSDS // 'hc1n.dev.lprnd.net'
});

let openConvs = {};

agent.on('connected', msg => {
    console.log('connected...');
    agent.setAgentState({ availability: "OFFLINE"}); // Do not route me conversations, I'll join by myself.
    agent.subscribeExConversations({
        'convState': ['OPEN'] // subscribes to all open conversation in the account.
    });
});

agent.on('cqm.ExConversationChangeNotification', notificationBody => {
    notificationBody.changes.forEach(change => {
        if (change.type === 'UPSERT') {
            if (!openConvs[change.result.convId]) {
                openConvs[change.result.convId] = change.result;                
                if (!getParticipantInfo(change.result.conversationDetails,agent.agentId)) {
                    agent.updateConversationField({
                        'conversationId': change.result.convId,
                        'conversationField': [{
                            'field': 'ParticipantsChange',
                            'type': 'ADD',
                            'role': 'MANAGER'
                        }]
                    }, (err, joinResp) => {
                        agent.publishEvent({
                            dialogId: change.result.convId,
                            event: {
                                type: 'ContentEvent',
                                contentType: 'text/plain',
                                message: 'welcome from bot'
                            }
                        });
                    });
                }
            }
        }
        else if (change.type === 'DELETE') {
            delete openConvs[change.result.convId];
            console.log(`conversation was closed.\n`);
        }
    });
});

agent.on('error', err => {
    console.log('got an error', err);
});

agent.on('closed', data => {
    console.log('socket closed', data);
    agent.reconnect();
});

function getParticipantInfo(convDetails,participantId) {
    convDetails.participants.filter(p=>p.id === participantId)[0];    
}
