// Test the /get_eq command to see if it uses Wolfix API properly
import pkg from './build/commands/get_eq.js';
const { data, execute } = pkg;

// Mock interaction object for testing
const mockInteraction = {
    reply: async (content) => {
        console.log('=== 返信内容 ===');
        if (typeof content === 'string') {
            console.log('テキスト:', content);
        } else if (content.embeds) {
            console.log('埋め込み数:', content.embeds.length);
            content.embeds.forEach((embed, index) => {
                console.log(`埋め込み[${index}]:`, {
                    title: embed.title,
                    description: embed.description?.substring(0, 100) + '...',
                    fields: embed.fields?.length || 0,
                    color: embed.color
                });
            });
        }
        if (content.files) {
            console.log('ファイル数:', content.files.length);
            content.files.forEach((file, index) => {
                console.log(`ファイル[${index}]: ${file.name}`);
            });
        }
        return { id: 'mock-message-id' };
    },
    followUp: async (content) => {
        console.log('=== フォローアップ内容 ===');
        console.log(content);
        return { id: 'mock-followup-id' };
    },
    user: { id: 'test-user' },
    guild: { id: 'test-guild' }
};

async function testGetEqCommand() {
    console.log('=== /get_eq コマンドテスト開始 ===');
    
    try {
        console.log('コマンド名:', data.name);
        console.log('説明:', data.description);
        
        console.log('コマンド実行中...');
        await execute(mockInteraction);
        
        console.log('✅ コマンド実行完了');
        
    } catch (error) {
        console.error('❌ コマンド実行エラー:', error);
        console.error('エラー詳細:', error.stack);
    }
    
    console.log('=== /get_eq コマンドテスト完了 ===');
}

testGetEqCommand();
