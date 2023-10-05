const FundraiserContract = artifacts.require("Fundraiser");

contract('Fundraiser', accounts => {
    let fundraiser;
    let name = '受取人名';
    const url = 'testurl';
    const imageURL = 'testimageURL';
    const description = 'testdescription';
    const beneficiary = accounts[1];
    const owner = accounts[0];

    beforeEach(async () => {
        fundraiser = await FundraiserContract.new(name, url, imageURL, description, beneficiary, owner);
    });

    describe('initialization', () => {
        it('受取人名を取得', async () => {
            const actual = await fundraiser.name();
            assert.equal(actual, name, '名前が一致していない');
        });

        it('URLを取得', async () => {
            const actual = await fundraiser.url();
            assert.equal(actual, url, 'URLが一致していない');
        });

        it('画像URLを取得', async () => {
            const actual = await fundraiser.imageURL();
            assert.equal(actual, imageURL, '画像URLが一致していない');
        });

        it('説明を取得', async () => {
            const actual = await fundraiser.description();
            assert.equal(actual, description, '説明が一致していない');
        });

        it('受取人を取得', async () => {
            const actual = await fundraiser.beneficiary();
            assert.equal(actual, beneficiary, '受取人が一致していない');
        });

        it('管理人を取得', async () => {
            const actual = await fundraiser.owner();
            assert.equal(actual, owner, '管理人が一致していない');
        });
    });

    describe('setBeneficiary', () => {
        const newBeneficiary = accounts[2];

        it('所有者アカウントが受取人を更新する', async () => {
            await fundraiser.setBeneficiary(newBeneficiary, { from: owner });
            const actualBeneficiary = await fundraiser.beneficiary();
            assert.equal(actualBeneficiary, newBeneficiary, '受取人が一致していない');
        });

        it('所有者ではないアカウントが呼び出したらエラーを吐く', async () => {
            try {
                await fundraiser.setBeneficiary(newBeneficiary, { from: accounts[1] });
                assert.fail('所有者に制限されていない');
            } catch (error) {
                const expectedError = 'Ownable: caller is not the owner';
                const actualError = error.reason;
                assert.equal(expectedError, actualError, 'should not be permitted');
            }
        });
    });

    describe('donationsを作成', () => {
        const value = web3.utils.toWei('0.0289');
        const donor = accounts[2];

        it('myDonationsCountを増やす', async () => {
            const currentDonationsCount = await fundraiser.myDonationsCount({ from: donor });
            await fundraiser.donate({ from: donor, value });
            const newDonationsCount = await fundraiser.myDonationsCount({ from: donor });

            assert.equal(1, newDonationsCount - currentDonationsCount, '寄付数が1増えていない');
        });
        it('myDonationsにdonationが含まれる', async () => {
            await fundraiser.donate({ from: donor, value });
            const { values, dates } = await fundraiser.myDonations({ from: donor });
            assert.equal(value, values[0], 'value should match');
            assert(dates[0], 'date should be present');
        });

        it('寄付の総額を増やす', async () => {
            const currentTotalDonations = await fundraiser.totalDonations();
            await fundraiser.donate({ from: donor, value });
            const newTotalDonations = await fundraiser.totalDonations();
            const diff = newTotalDonations - currentTotalDonations;

            assert.equal(diff, value, 'difference should match the value');
        });

        it('寄付数を増やす', async () => {
            const currentDonationsCount = await fundraiser.donationsCount();
            await fundraiser.donate({ from: donor, value });
            const newDonationsCount = await fundraiser.donationsCount();
            const diff = newDonationsCount - currentDonationsCount;

            assert.equal(diff, 1, 'difference count should increment by 1');
        })

        it('emits the DonationReceived event', async () => {
            const tx = await fundraiser.donate({ from: donor, value });
            const expectEvent = 'DonationReceived';
            const actualEvent = tx.logs[0].event;

            assert.equal(expectEvent, actualEvent, 'event should match');
        });
    });

    describe('資金の引き出し', () => {
        beforeEach(async () => {
            await fundraiser.donate(
                { from: accounts[2], value: web3.utils.toWei('0.1') }
            );
        });

        describe('アクセスコントロール', () => {
            it('非所有者が呼び出した場合エラーをはく', async () => {
                try {
                    await fundraiser.withdraw({ from: accounts[3] });
                    assert.fail('withdrawが所有者に制限されていない');
                } catch (error) {
                    const expectedError = 'Ownable: caller is not the owner';
                    const actualError = error.reason;
                    assert.equal(expectedError, actualError, 'should not be permitted');
                }
            });

            it('所有者の呼び出しを許可する', async () => {
                try {
                    await fundraiser.withdraw({ from: owner });
                    assert(true, 'no errors were thrown');
                } catch (error) {
                    assert.fail('shold not have thrown error');
                }
            });

            it('受取人に残高を送金する', async () => {
                const currentContractBalance = await web3.eth.getBalance(fundraiser.address);
                const currentBeneficiaryBalance = await web3.eth.getBalance(beneficiary);

                await fundraiser.withdraw({ from: owner });

                const newContractBalance = await web3.eth.getBalance(fundraiser.address);
                const newBeneficiaryBalance = await web3.eth.getBalance(beneficiary);

                const beneficiaryDifference = newBeneficiaryBalance - currentBeneficiaryBalance;

                assert.equal(newContractBalance, 0, 'contract should have 0 balance');
                assert.equal(beneficiaryDifference, currentContractBalance, 'beneficiary should received all the funds');
            });

            it('emits the Withdraw event', async () => {
                const tx = await fundraiser.withdraw({ from: owner });
                const expectEvent = 'Withdraw';
                const actualEvent = tx.logs[0].event;

                assert.equal(expectEvent, actualEvent, 'event should match');
            });
        });
    });

    describe('fallback function', () => {
        const value = web3.utils.toWei('0.0289');

        it('寄付の総額を増やす', async () => {
            const currentTotalDonations = await fundraiser.totalDonations();
            await web3.eth.sendTransaction({ to: fundraiser.address, from: accounts[9], value });
            const newTotalDonations = await fundraiser.totalDonations();
            const diff = newTotalDonations - currentTotalDonations;

            assert.equal(diff, value, 'difference should match the value');
        });

        it('寄付数を増やす', async () => {
            const currentDonationsCount = await fundraiser.donationsCount();
            await web3.eth.sendTransaction({ to: fundraiser.address, from: accounts[9], value });
            const newDonationsCount = await fundraiser.donationsCount();
            const diff = newDonationsCount - currentDonationsCount;

            assert.equal(diff, 1, 'difference count should increment by 1');
        })
    });
});